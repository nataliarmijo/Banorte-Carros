/**
 * Adaptador de lectura/escritura para /reservaciones: arma las listas y el
 * detalle (línea de tiempo + historial de decisiones) a partir de los
 * modelos persistidos (Solicitud, Reservacion, Aprobacion, RegistroAuditoria,
 * CheckIn/CheckOut), y expone la acción de cancelar una solicitud.
 */

import { db } from "@/lib/repositories/dexie";
import {
  reservacionesRepository,
  solicitudesRepository,
  registrosAuditoriaRepository,
} from "@/lib/repositories/typed-repositories";
import type { Aprobacion, CheckIn, CheckOut, EstadoSolicitud, Reservacion, RegistroAuditoria, Solicitud } from "@/lib/models";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { crearResultadoSinDatos } from "@/lib/services/types";
import type { ResultadoSinDatos, TipoVehiculo } from "@/lib/services/types";
import { construirCandidatosFlota } from "@/lib/adapters/flota";
import { puntuarVehiculo, type SolicitudAsignacion, type VehiculoPuntuado } from "@/lib/services/servicioAsignacion";

const TIPOS_VEHICULO_VALIDOS: readonly TipoVehiculo[] = ["sedan-compacto", "sedan-ejecutivo", "suv-asignado"];
function esTipoVehiculoValido(valor: string | undefined): valor is TipoVehiculo {
  return TIPOS_VEHICULO_VALIDOS.includes(valor as TipoVehiculo);
}

/**
 * Recalcula, con los datos ACTUALES de la flotilla (utilización, kilometraje,
 * mantenimiento, incidencias), el puntaje ponderado que el motor de
 * asignación (Chunk 5) le daría hoy al vehículo ya asignado — para que el
 * historial de la reservación pueda explicar "por qué se eligió este
 * vehículo". No es necesariamente idéntico al puntaje en el momento de la
 * asignación original (las condiciones de la flotilla cambian con el
 * tiempo); por eso siempre se marca como estimado/recalculado.
 */
async function calcularPuntajeAsignacionActual(solicitud: Solicitud, reservacion: Reservacion | null): Promise<VehiculoPuntuado | null> {
  if (!reservacion || reservacion.modalidadAsignada === "UBER") return null;
  if (!esTipoVehiculoValido(solicitud.tipoVehiculoRequerido)) return null;

  const candidatos = await construirCandidatosFlota(solicitud.territorioId);
  const delMismaModalidad = candidatos.filter((c) => c.modalidad === reservacion.modalidadAsignada);
  const asignado = delMismaModalidad.find((c) => c.id === reservacion.vehiculoId);
  if (!asignado) return null;

  const solicitudAsignacion: SolicitudAsignacion = {
    territorio: solicitud.territorioId,
    origen: solicitud.territorioId,
    fechaSalida: new Date(reservacion.fechaInicio),
    fechaRegreso: new Date(reservacion.fechaFin),
    tipoVehiculoRequerido: solicitud.tipoVehiculoRequerido,
    pasajeros: solicitud.pasajeros && solicitud.pasajeros > 0 ? solicitud.pasajeros : 1,
  };

  return puntuarVehiculo(asignado, solicitudAsignacion, delMismaModalidad);
}

export interface SolicitudListItem {
  solicitud: Solicitud;
  reservacion: Reservacion | null;
  vehiculoNombre: string | null;
}

async function resolverVehiculoNombre(reservacion: Reservacion | null): Promise<string | null> {
  if (!reservacion) return null;
  if (reservacion.vehiculoId.startsWith("uber-")) return "Uber (servicio externo)";
  const vehiculo = await db.vehiculos.get(reservacion.vehiculoId);
  return vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})` : null;
}

async function construirListItems(solicitudes: Solicitud[]): Promise<SolicitudListItem[]> {
  const items = await Promise.all(
    solicitudes.map(async (solicitud): Promise<SolicitudListItem> => {
      const reservaciones = await db.reservaciones.where("solicitudId").equals(solicitud.id).toArray();
      const reservacion = reservaciones[0] ?? null;
      const vehiculoNombre = await resolverVehiculoNombre(reservacion);
      return { solicitud, reservacion, vehiculoNombre };
    })
  );

  return items.sort((a, b) => b.solicitud.fechaCreacion.localeCompare(a.solicitud.fechaCreacion));
}

/** Solicitudes creadas por el propio usuario (vista Colaborador: "Mis reservaciones"). */
export async function listarSolicitudesDeUsuario(usuarioId: string): Promise<SolicitudListItem[]> {
  const solicitudes = await db.solicitudes.where("usuarioSolicitanteId").equals(usuarioId).toArray();
  return construirListItems(solicitudes);
}

/** Solicitudes de todo el territorio (vista Aprobador: "Solicitudes de mi equipo"). */
export async function listarSolicitudesDeTerritorio(territorioId: string): Promise<SolicitudListItem[]> {
  const solicitudes = await db.solicitudes.where("territorioId").equals(territorioId).toArray();
  return construirListItems(solicitudes);
}

export interface HitoTimeline {
  clave: string;
  titulo: string;
  fecha: string | null;
  estado: "completado" | "actual" | "pendiente";
}

export interface DecisionHistorialItem {
  tipo: "aprobacion" | "auditoria";
  fecha: string;
  titulo: string;
  detalle: string;
  usuarioNombre: string;
}

export interface DetalleSolicitud {
  solicitud: Solicitud;
  reservacion: Reservacion | null;
  vehiculoNombre: string | null;
  solicitanteNombre: string;
  territorioNombre: string;
  timeline: HitoTimeline[];
  historial: DecisionHistorialItem[];
  /** Cifras reales del viaje (check-out), cuando ya se completó. */
  checkOut: CheckOut | null;
  /** Puntaje del motor de asignación (Chunk 5) recalculado con datos actuales; null si es Uber o no se pudo recalcular. */
  puntajeAsignacion: VehiculoPuntuado | null;
}

function construirTimeline(
  solicitud: Solicitud,
  reservacion: Reservacion | null,
  checkIn: CheckIn | null,
  checkOut: CheckOut | null,
  decisionFinal: Aprobacion | undefined
): HitoTimeline[] {
  const estado = solicitud.estadoSolicitud;

  const hitos: HitoTimeline[] = [
    { clave: "creada", titulo: "Solicitud creada", fecha: solicitud.fechaCreacion, estado: "completado" },
  ];

  if (estado === "RECHAZADA") {
    hitos.push({
      clave: "rechazada",
      titulo: "Rechazada",
      fecha: decisionFinal?.fechaDecision ?? solicitud.fechaActualizacion,
      estado: "completado",
    });
    return hitos;
  }

  if (estado === "CANCELADA") {
    hitos.push({ clave: "cancelada", titulo: "Cancelada", fecha: solicitud.fechaActualizacion, estado: "completado" });
    return hitos;
  }

  const yaPasoAprobacion = estado !== "BORRADOR" && estado !== "PENDIENTE_APROBACION";
  hitos.push({
    clave: "aprobada",
    titulo: solicitud.requiereAprobacionEspecial ? "Aprobada" : "Aprobación automática (dentro de política)",
    fecha: yaPasoAprobacion ? (decisionFinal?.fechaDecision ?? solicitud.fechaCreacion) : null,
    estado: yaPasoAprobacion ? "completado" : estado === "PENDIENTE_APROBACION" ? "actual" : "pendiente",
  });

  const yaAsignada = Boolean(reservacion);
  hitos.push({
    clave: "asignada",
    titulo: "Vehículo asignado",
    fecha: reservacion?.fechaCreacion ?? null,
    estado: yaAsignada ? "completado" : yaPasoAprobacion ? "actual" : "pendiente",
  });

  const yaCheckIn = Boolean(checkIn);
  hitos.push({
    clave: "checkin",
    titulo: "Check-in",
    fecha: checkIn?.fechaHoraCheckIn ?? null,
    estado: yaCheckIn ? "completado" : estado === "LISTA_CHECK_IN" ? "actual" : "pendiente",
  });

  const enCursoOMas = estado === "EN_CURSO" || estado === "COMPLETADA";
  hitos.push({
    clave: "encurso",
    titulo: "En curso",
    fecha: enCursoOMas && checkIn ? checkIn.fechaHoraCheckIn : null,
    estado: enCursoOMas ? "completado" : yaCheckIn ? "actual" : "pendiente",
  });

  const yaCheckOut = Boolean(checkOut);
  hitos.push({
    clave: "checkout",
    titulo: "Check-out",
    fecha: checkOut?.fechaHoraCheckOut ?? null,
    estado: yaCheckOut ? "completado" : enCursoOMas ? "actual" : "pendiente",
  });

  hitos.push({
    clave: "completada",
    titulo: "Completada",
    fecha: estado === "COMPLETADA" ? solicitud.fechaActualizacion : null,
    estado: estado === "COMPLETADA" ? "completado" : yaCheckOut ? "actual" : "pendiente",
  });

  return hitos;
}

async function construirHistorial(
  aprobaciones: Aprobacion[],
  auditorias: RegistroAuditoria[]
): Promise<DecisionHistorialItem[]> {
  const usuarioIds = new Set<string>();
  aprobaciones.forEach((a) => usuarioIds.add(a.aprobadorId));
  auditorias.forEach((a) => usuarioIds.add(a.usuarioId));

  const usuarios = await Promise.all([...usuarioIds].map((id) => db.usuarios.get(id)));
  const nombrePorId = new Map(usuarios.filter((u): u is NonNullable<typeof u> => Boolean(u)).map((u) => [u.id, u.nombreCompleto]));

  const itemsAprobacion: DecisionHistorialItem[] = aprobaciones
    .filter((a) => a.decision !== "PENDIENTE")
    .map((a) => ({
      tipo: "aprobacion" as const,
      fecha: a.fechaDecision,
      titulo: a.decision === "APROBADA" ? "Solicitud aprobada" : "Solicitud rechazada",
      detalle: a.comentario || a.reglaAplicada,
      usuarioNombre: nombrePorId.get(a.aprobadorId) ?? "Aprobador",
    }));

  const itemsAuditoria: DecisionHistorialItem[] = auditorias
    .filter((a) => a.accion !== "CREAR")
    .map((a) => {
      let detalle = a.accion;
      let titulo: string = a.accion;
      try {
        const cambios = JSON.parse(a.cambiosJson) as Record<string, unknown>;
        if (a.accion === "REASIGNACION_MANUAL") {
          titulo = "Vehículo reasignado manualmente";
          detalle = `Motivo: ${cambios.justificacion ?? "sin especificar"}`;
        } else if (a.accion === "CANCELACION") {
          titulo = "Solicitud cancelada";
          detalle = "El colaborador canceló la solicitud.";
        } else {
          detalle = Object.entries(cambios)
            .map(([clave, valor]) => `${clave}: ${valor}`)
            .join(", ");
        }
      } catch {
        // cambiosJson no parseable: se conserva la acción como detalle
      }
      return {
        tipo: "auditoria" as const,
        fecha: a.fechaCambio,
        titulo,
        detalle,
        usuarioNombre: nombrePorId.get(a.usuarioId) ?? "Usuario",
      };
    });

  return [...itemsAprobacion, ...itemsAuditoria].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function obtenerDetalleSolicitud(solicitudId: string): Promise<DetalleSolicitud | null> {
  const solicitud = await solicitudesRepository.getById(solicitudId);
  if (!solicitud) return null;

  const [reservaciones, aprobaciones, auditoriaSolicitud, solicitante] = await Promise.all([
    db.reservaciones.where("solicitudId").equals(solicitudId).toArray(),
    db.aprobaciones.where("solicitudId").equals(solicitudId).toArray(),
    db.registrosAuditoria.where("entidadId").equals(solicitudId).toArray(),
    db.usuarios.get(solicitud.usuarioSolicitanteId),
  ]);

  const reservacion = reservaciones[0] ?? null;
  const vehiculoNombre = await resolverVehiculoNombre(reservacion);

  const [auditoriaReservacion, checkIns, checkOuts] = reservacion
    ? await Promise.all([
        db.registrosAuditoria.where("entidadId").equals(reservacion.id).toArray(),
        db.checkIns.where("reservacionId").equals(reservacion.id).toArray(),
        db.checkOuts.where("reservacionId").equals(reservacion.id).toArray(),
      ])
    : [[] as RegistroAuditoria[], [] as CheckIn[], [] as CheckOut[]];

  const checkIn = checkIns[0] ?? null;
  const checkOut = checkOuts[0] ?? null;
  const decisionFinal = aprobaciones.find((a) => a.decision === "APROBADA" || a.decision === "RECHAZADA");

  const [historial, puntajeAsignacion] = await Promise.all([
    construirHistorial(aprobaciones, [...auditoriaSolicitud, ...auditoriaReservacion]),
    calcularPuntajeAsignacionActual(solicitud, reservacion),
  ]);
  const timeline = construirTimeline(solicitud, reservacion, checkIn, checkOut, decisionFinal);

  const territorio = PARAMS_CONFIG.territorios[solicitud.territorioId as keyof typeof PARAMS_CONFIG.territorios];

  return {
    solicitud,
    reservacion,
    vehiculoNombre,
    solicitanteNombre: solicitante?.nombreCompleto ?? "Usuario desconocido",
    territorioNombre: territorio?.nombre ?? solicitud.territorioId,
    timeline,
    historial,
    checkOut,
    puntajeAsignacion,
  };
}

export const ESTADOS_CANCELABLES: EstadoSolicitud[] = ["BORRADOR", "PENDIENTE_APROBACION", "APROBADA", "ASIGNADA"];

export function esViajeFuturo(solicitud: Solicitud): boolean {
  const fechaHora = new Date(`${solicitud.fechaSolicitud}T${solicitud.horaInicioDeseada}:00`);
  return fechaHora.getTime() > Date.now();
}

export function esCancelable(solicitud: Solicitud): boolean {
  return ESTADOS_CANCELABLES.includes(solicitud.estadoSolicitud) && esViajeFuturo(solicitud);
}

export async function cancelarSolicitud(
  solicitudId: string,
  usuarioId: string
): Promise<Solicitud | ResultadoSinDatos> {
  const solicitud = await solicitudesRepository.getById(solicitudId);
  if (!solicitud) {
    return crearResultadoSinDatos(`No existe la solicitud ${solicitudId}`);
  }
  if (!esCancelable(solicitud)) {
    return crearResultadoSinDatos("Esta solicitud ya no se puede cancelar");
  }

  const ahora = new Date().toISOString();
  const actualizada = await solicitudesRepository.update(solicitudId, {
    estadoSolicitud: "CANCELADA",
    fechaActualizacion: ahora,
  });

  const reservaciones = await db.reservaciones.where("solicitudId").equals(solicitudId).toArray();
  if (reservaciones[0]) {
    await reservacionesRepository.update(reservaciones[0].id, {
      estadoReservacion: "CANCELADA",
      fechaActualizacion: ahora,
    });
  }

  await registrosAuditoriaRepository.create({
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioId,
    estatus: "ACTIVO",
    entidad: "Solicitud",
    entidadId: solicitudId,
    accion: "CANCELACION",
    usuarioId,
    cambiosJson: JSON.stringify({ estadoAnterior: solicitud.estadoSolicitud, estadoNuevo: "CANCELADA" }),
    fechaCambio: ahora,
  });

  return actualizada as Solicitud;
}
