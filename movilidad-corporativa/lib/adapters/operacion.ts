/**
 * Adaptador para /operacion (rol Admin Flota): arma el panel operativo del
 * día (entregas/devoluciones pendientes, retrasos, disponibilidad de flota,
 * incidencias abiertas) a partir de los modelos persistidos por los flujos
 * de solicitud, aprobación, check-in y check-out de los chunks anteriores, y
 * expone las acciones de reasignación manual (reutilizando
 * `reasignarManualmente` del Chunk 5) y de marcar una entrega/devolución
 * como coordinada.
 */

import { db } from "@/lib/repositories/dexie";
import { registrosAuditoriaRepository, vehiculosRepository } from "@/lib/repositories/typed-repositories";
import type { Incidencia, Mantenimiento, ModalidadVehiculo, Reservacion, Solicitud, Vehiculo } from "@/lib/models";
import { PARAMS_CONFIG } from "@/lib/config/params";
import {
  reasignarManualmente,
  estaDisponibleParaPeriodo,
  type ResultadoReasignacion,
} from "@/lib/services/servicioAsignacion";
import { construirCandidatosFlota, type CandidatoFlota } from "@/lib/adapters/flota";
import { esResultadoSinDatos } from "@/lib/services/types";
import type { ResultadoSinDatos } from "@/lib/services/types";
import { esIncidenciaAbierta } from "@/lib/ui/incidencias";

/** Fecha calendario LOCAL (no UTC) en formato yyyy-MM-dd; consistente con un <input type="date">. */
export function fechaLocalISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function nombreTerritorio(territorioId: string): string {
  const territorio = PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios];
  return territorio?.nombre ?? territorioId;
}

export interface FilaOperativa {
  solicitud: Solicitud;
  reservacion: Reservacion | null;
  vehiculo: Vehiculo | null;
  solicitanteNombre: string;
  territorioNombre: string;
  /** Salida planeada hoy y todavía sin check-in. */
  esEntregaPendiente: boolean;
  /** Regreso planeado hoy (o antes) y todavía sin check-out. */
  esDevolucionPendiente: boolean;
  /** El check-out no se ha realizado y ya pasó la hora de regreso planeada. */
  esRetrasada: boolean;
  minutosRetraso: number;
  entregaCoordinada: boolean;
  devolucionCoordinada: boolean;
}

export interface VehiculoOperativo {
  vehiculo: Vehiculo;
  territorioNombre: string;
  ultimoMantenimiento: Mantenimiento | null;
  folioReservacionActiva: string | null;
}

export interface IncidenciaOperativa {
  incidencia: Incidencia;
  vehiculo: Vehiculo | null;
  territorioNombre: string;
  folioSolicitud: string | null;
}

export interface PanelOperativo {
  fecha: string;
  filas: FilaOperativa[];
  /** Reservaciones "En curso" cuya hora de regreso planeada ya pasó, sin importar la fecha filtrada (siempre en vivo). */
  retrasos: FilaOperativa[];
  vehiculos: VehiculoOperativo[];
  incidencias: IncidenciaOperativa[];
}

const ACCION_ENTREGA_COORDINADA = "ENTREGA_COORDINADA";
const ACCION_DEVOLUCION_COORDINADA = "DEVOLUCION_COORDINADA";

async function construirNombresUsuarios(solicitudes: Solicitud[]): Promise<Map<string, string>> {
  const ids = [...new Set(solicitudes.map((s) => s.usuarioSolicitanteId))];
  const usuarios = await Promise.all(ids.map((id) => db.usuarios.get(id)));
  return new Map(usuarios.filter((u): u is NonNullable<typeof u> => Boolean(u)).map((u) => [u.id, u.nombreCompleto]));
}

function construirFila(
  solicitud: Solicitud,
  reservacion: Reservacion | null,
  vehiculo: Vehiculo | null,
  nombrePorUsuario: Map<string, string>,
  coordinaciones: Set<string>,
  ahora: Date
): FilaOperativa {
  const hoyISO = fechaLocalISO(ahora);
  const salidaPlaneadaHoy = solicitud.fechaSolicitud === hoyISO;
  const yaHizoCheckIn = solicitud.estadoSolicitud !== "ASIGNADA" && solicitud.estadoSolicitud !== "LISTA_CHECK_IN";
  const esEntregaPendiente =
    salidaPlaneadaHoy && !yaHizoCheckIn && (solicitud.estadoSolicitud === "ASIGNADA" || solicitud.estadoSolicitud === "LISTA_CHECK_IN");

  const enCurso = reservacion?.estadoReservacion === "EN_CURSO";
  const fechaFinPlaneada = reservacion ? new Date(reservacion.fechaFin) : null;
  const devolucionPlaneadaHoy = fechaFinPlaneada ? fechaLocalISO(fechaFinPlaneada) === hoyISO : false;
  const yaPaso = fechaFinPlaneada ? fechaFinPlaneada.getTime() < ahora.getTime() : false;
  const esRetrasada = enCurso && yaPaso;
  const minutosRetraso = esRetrasada && fechaFinPlaneada ? Math.round((ahora.getTime() - fechaFinPlaneada.getTime()) / 60000) : 0;
  const esDevolucionPendiente = enCurso && (devolucionPlaneadaHoy || esRetrasada);

  return {
    solicitud,
    reservacion,
    vehiculo,
    solicitanteNombre: nombrePorUsuario.get(solicitud.usuarioSolicitanteId) ?? "Usuario desconocido",
    territorioNombre: nombreTerritorio(solicitud.territorioId),
    esEntregaPendiente,
    esDevolucionPendiente,
    esRetrasada,
    minutosRetraso,
    entregaCoordinada: reservacion ? coordinaciones.has(`${reservacion.id}:${ACCION_ENTREGA_COORDINADA}`) : false,
    devolucionCoordinada: reservacion ? coordinaciones.has(`${reservacion.id}:${ACCION_DEVOLUCION_COORDINADA}`) : false,
  };
}

/** true si la solicitud/reservación es relevante para el panel del día de `fechaISO`. */
function esRelevantePara(fechaISO: string, hoyISO: string, solicitud: Solicitud, reservacion: Reservacion | null): boolean {
  if (solicitud.fechaSolicitud === fechaISO) return true;
  if (reservacion && fechaLocalISO(new Date(reservacion.fechaFin)) === fechaISO) return true;
  if (fechaISO === hoyISO && reservacion?.estadoReservacion === "EN_CURSO") return true;
  return false;
}

/** Arma el panel operativo del día seleccionado (por defecto hoy) para el rol Admin Flota. */
export async function obtenerPanelOperativo(fecha?: string): Promise<PanelOperativo> {
  const ahora = new Date();
  const hoyISO = fechaLocalISO(ahora);
  const fechaSeleccionada = fecha ?? hoyISO;

  const [solicitudes, reservaciones, vehiculosFlota, incidenciasTodas, registrosAuditoria, mantenimientos] = await Promise.all([
    db.solicitudes.toArray(),
    db.reservaciones.toArray(),
    db.vehiculos.where("modalidad").anyOf(["POOL", "ASIGNADO"]).toArray(),
    db.incidencias.toArray(),
    db.registrosAuditoria.toArray(),
    db.mantenimientos.toArray(),
  ]);

  const reservacionPorSolicitud = new Map(reservaciones.map((r) => [r.solicitudId, r]));
  const vehiculoPorId = new Map(vehiculosFlota.map((v) => [v.id, v]));
  const nombrePorUsuario = await construirNombresUsuarios(solicitudes);
  const folioPorSolicitudId = new Map(solicitudes.map((s) => [s.id, s.folio]));

  const coordinacionesHoy = new Set(
    registrosAuditoria
      .filter(
        (a) =>
          (a.accion === ACCION_ENTREGA_COORDINADA || a.accion === ACCION_DEVOLUCION_COORDINADA) &&
          fechaLocalISO(new Date(a.fechaCambio)) === hoyISO
      )
      .map((a) => `${a.entidadId}:${a.accion}`)
  );

  const filas: FilaOperativa[] = [];
  const retrasos: FilaOperativa[] = [];

  for (const solicitud of solicitudes) {
    const reservacion = reservacionPorSolicitud.get(solicitud.id) ?? null;
    const vehiculo = reservacion ? (vehiculoPorId.get(reservacion.vehiculoId) ?? null) : null;
    const fila = construirFila(solicitud, reservacion, vehiculo, nombrePorUsuario, coordinacionesHoy, ahora);

    if (fila.esRetrasada) retrasos.push(fila);
    if (esRelevantePara(fechaSeleccionada, hoyISO, solicitud, reservacion)) filas.push(fila);
  }

  filas.sort((a, b) => a.solicitud.horaInicioDeseada.localeCompare(b.solicitud.horaInicioDeseada));

  const reservacionActivaPorVehiculo = new Map(
    reservaciones.filter((r) => r.estadoReservacion === "EN_CURSO").map((r) => [r.vehiculoId, r])
  );

  const vehiculos: VehiculoOperativo[] = vehiculosFlota.map((vehiculo) => {
    const mantenimientosVehiculo = mantenimientos
      .filter((m) => m.vehiculoId === vehiculo.id && m.fechaRealizada)
      .sort((a, b) => (b.fechaRealizada as string).localeCompare(a.fechaRealizada as string));
    const reservacionActiva = reservacionActivaPorVehiculo.get(vehiculo.id);

    return {
      vehiculo,
      territorioNombre: nombreTerritorio(vehiculo.territorioId),
      ultimoMantenimiento: mantenimientosVehiculo[0] ?? null,
      folioReservacionActiva: reservacionActiva ? (folioPorSolicitudId.get(reservacionActiva.solicitudId) ?? null) : null,
    };
  });

  const incidenciasAbiertas = incidenciasTodas.filter((i) => esIncidenciaAbierta(i.estadoIncidencia));
  const solicitudPorReservacion = new Map(reservaciones.map((r) => [r.id, r.solicitudId]));
  const incidencias: IncidenciaOperativa[] = incidenciasAbiertas.map((incidencia) => {
    const vehiculo = vehiculoPorId.get(incidencia.vehiculoId) ?? null;
    const solicitudId = incidencia.reservacionId ? solicitudPorReservacion.get(incidencia.reservacionId) : undefined;
    return {
      incidencia,
      vehiculo,
      territorioNombre: vehiculo ? nombreTerritorio(vehiculo.territorioId) : "Territorio desconocido",
      folioSolicitud: solicitudId ? (folioPorSolicitudId.get(solicitudId) ?? null) : null,
    };
  });

  return { fecha: fechaSeleccionada, filas, retrasos, vehiculos, incidencias };
}

/** Registra (en RegistroAuditoria) que el admin coordinó la entrega o devolución de hoy para una reservación. */
export async function marcarCoordinacion(
  reservacionId: string,
  tipo: "ENTREGA" | "DEVOLUCION",
  usuarioId: string
): Promise<void> {
  const ahora = new Date().toISOString();
  await registrosAuditoriaRepository.create({
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioId,
    estatus: "ACTIVO",
    entidad: "Reservacion",
    entidadId: reservacionId,
    accion: tipo === "ENTREGA" ? ACCION_ENTREGA_COORDINADA : ACCION_DEVOLUCION_COORDINADA,
    usuarioId,
    cambiosJson: JSON.stringify({ tipo, fecha: fechaLocalISO(new Date()) }),
    fechaCambio: ahora,
  });
}

/** Candidatos disponibles para reasignar (misma modalidad y territorio del vehículo actual, disponibles para el periodo, excluyendo el actual). */
export async function listarCandidatosReasignacion(reservacion: Reservacion, territorioId: string): Promise<Vehiculo[]> {
  const candidatos = await construirCandidatosFlota(territorioId);
  const fechaInicio = new Date(reservacion.fechaInicio);
  const fechaFin = new Date(reservacion.fechaFin);

  const idsCompatibles = candidatos
    .filter((c: CandidatoFlota) => c.id !== reservacion.vehiculoId && c.modalidad === reservacion.modalidadAsignada)
    .filter((c) => estaDisponibleParaPeriodo(c, fechaInicio, fechaFin))
    .map((c) => c.id);

  const vehiculos = await Promise.all(idsCompatibles.map((id) => db.vehiculos.get(id)));
  return vehiculos.filter((v): v is Vehiculo => Boolean(v));
}

export interface ReasignacionInput {
  solicitudId: string;
  vehiculoNuevoId: string;
  justificacion: string;
  usuarioId: string;
}

/**
 * Reasigna manualmente el vehículo de una reservación (reutilizando
 * `reasignarManualmente` del Chunk 5) y, si la reservación ya está "En
 * curso" (canje de una unidad físicamente en uso), sincroniza el estado
 * operativo de ambos vehículos para que el panel siga siendo consistente.
 */
export async function reasignarVehiculoOperacion(input: ReasignacionInput): Promise<ResultadoReasignacion | ResultadoSinDatos> {
  const resultado = await reasignarManualmente(input.solicitudId, input.vehiculoNuevoId, input.justificacion, input.usuarioId);
  if (esResultadoSinDatos(resultado)) return resultado;

  if (resultado.reservacion.estadoReservacion === "EN_CURSO") {
    const ahora = new Date().toISOString();
    const cambios = JSON.parse(resultado.registroAuditoria.cambiosJson) as { vehiculoAnteriorId: string };
    await vehiculosRepository.update(cambios.vehiculoAnteriorId, {
      estadoOperativo: "DISPONIBLE",
      disponibilidadActual: true,
      fechaActualizacion: ahora,
    });
    await vehiculosRepository.update(input.vehiculoNuevoId, {
      estadoOperativo: "OCUPADO",
      disponibilidadActual: false,
      fechaActualizacion: ahora,
    });
  }

  return resultado;
}

/** Nombres de tipo de vehículo y modalidades presentes en la flota, para construir opciones de filtro. */
export function extraerTiposVehiculo(vehiculos: VehiculoOperativo[]): string[] {
  return [...new Set(vehiculos.map((v) => v.vehiculo.tipoVehiculo))].sort();
}

export const MODALIDADES_FLOTA: ModalidadVehiculo[] = ["POOL", "ASIGNADO"];
