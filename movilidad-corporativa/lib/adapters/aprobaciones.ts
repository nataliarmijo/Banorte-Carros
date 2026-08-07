/**
 * Adaptador para /aprobaciones (rol Aprobador/Jefe): arma la cola de
 * solicitudes "Pendiente de aprobación" del territorio del usuario activo,
 * reconstruyendo la comparación de alternativas con el mismo
 * servicioComparador y los mismos datos persistidos de la Solicitud que usó
 * el Chunk 6 (no se recalcula con una lógica distinta), y expone las tres
 * acciones de decisión del aprobador: Aprobar, Rechazar y Solicitar cambios.
 */

import { db } from "@/lib/repositories/dexie";
import {
  aprobacionesRepository,
  registrosAuditoriaRepository,
  reservacionesRepository,
  solicitudesRepository,
} from "@/lib/repositories/typed-repositories";
import type { Aprobacion, EstadoSolicitud, Reservacion, Solicitud } from "@/lib/models";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { evaluarAlternativasParaSolicitud, asignarVehiculoDeFlota, type DatosEvaluacion } from "@/lib/adapters/flota";
import { esResultadoSinDatos, crearResultadoSinDatos } from "@/lib/services/types";
import type { Alternativa, ResultadoComparacion, ResultadoSinDatos, TipoVehiculo } from "@/lib/services/types";
import type { SolicitudAsignacion } from "@/lib/services/servicioAsignacion";
import { proveedorUber } from "@/lib/integraciones/uber";
import { proveedorNotificaciones } from "@/lib/integraciones/notificaciones";
import { notificarSolicitudRechazada, notificarSolicitudAprobada, notificarVehiculoAsignado } from "@/lib/adapters/notificaciones";

const TIPOS_VEHICULO_VALIDOS: readonly TipoVehiculo[] = ["sedan-compacto", "sedan-ejecutivo", "suv-asignado"];

function esTipoVehiculoValido(valor: string | undefined): valor is TipoVehiculo {
  return TIPOS_VEHICULO_VALIDOS.includes(valor as TipoVehiculo);
}

function combinarFechaHora(fechaISO: string, horaHHmm: string): Date {
  return new Date(`${fechaISO}T${horaHHmm}:00`);
}

/**
 * Reconstruye los datos que necesita evaluarAlternativasParaSolicitud a
 * partir de una Solicitud ya persistida. Devuelve null cuando a la
 * solicitud le faltan campos de viaje (distancia, pasajeros, tipo de
 * vehículo) necesarios para recalcular la comparación.
 */
function construirDatosEvaluacion(solicitud: Solicitud): DatosEvaluacion | null {
  if (
    !solicitud.distanciaEstimadaKm ||
    solicitud.distanciaEstimadaKm <= 0 ||
    !solicitud.pasajeros ||
    solicitud.pasajeros <= 0 ||
    !esTipoVehiculoValido(solicitud.tipoVehiculoRequerido)
  ) {
    return null;
  }

  return {
    territorio: solicitud.territorioId,
    distanciaEstimadaKm: solicitud.distanciaEstimadaKm,
    duracionEstimadaMinutos: solicitud.duracionEstimadaMinutos,
    fechaSalida: combinarFechaHora(solicitud.fechaSolicitud, solicitud.horaInicioDeseada),
    fechaRegreso: combinarFechaHora(solicitud.fechaRegreso ?? solicitud.fechaSolicitud, solicitud.horaFinDeseada),
    pasajeros: solicitud.pasajeros,
    tipoVehiculoRequerido: solicitud.tipoVehiculoRequerido,
  };
}

function calcularAhorroEstimado(resultado: ResultadoComparacion, medioElegido: Alternativa): number {
  const costoMasCaro = Math.max(...resultado.alternativas.map((a) => a.costo.costoTotal));
  const costoElegido = resultado.alternativas.find((a) => a.tipo === medioElegido)?.costo.costoTotal ?? costoMasCaro;
  return Math.max(0, costoMasCaro - costoElegido);
}

export interface SolicitudPendiente {
  solicitud: Solicitud;
  solicitanteNombre: string;
  territorioNombre: string;
  /** Comparación recalculada con servicioComparador; null si faltan datos de viaje. */
  resultado: ResultadoComparacion | null;
  motivoSinDatos?: string;
  medioRecomendado: Alternativa;
  ahorroEstimado: number;
  esUrgente: boolean;
  horasHastaSalida: number;
}

/** Solicitudes "Pendiente de aprobación" del territorio del aprobador, con la comparación de alternativas ya calculada. */
export async function listarSolicitudesPendientes(territorioId: string): Promise<SolicitudPendiente[]> {
  const solicitudes = await db.solicitudes
    .where("territorioId")
    .equals(territorioId)
    .and((s) => s.estadoSolicitud === "PENDIENTE_APROBACION")
    .toArray();

  if (solicitudes.length === 0) return [];

  const usuarioIds = [...new Set(solicitudes.map((s) => s.usuarioSolicitanteId))];
  const usuarios = await Promise.all(usuarioIds.map((id) => db.usuarios.get(id)));
  const nombrePorId = new Map(
    usuarios.filter((u): u is NonNullable<typeof u> => Boolean(u)).map((u) => [u.id, u.nombreCompleto])
  );
  const territorio = PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios];
  const ahora = Date.now();

  const items = await Promise.all(
    solicitudes.map(async (solicitud): Promise<SolicitudPendiente> => {
      const datosEvaluacion = construirDatosEvaluacion(solicitud);
      let resultado: ResultadoComparacion | null = null;
      let motivoSinDatos: string | undefined;

      if (datosEvaluacion) {
        const evaluacion = await evaluarAlternativasParaSolicitud(
          datosEvaluacion,
          PARAMS_CONFIG.limitesCostoEspecial.colaborador
        );
        if (esResultadoSinDatos(evaluacion.resultado)) {
          motivoSinDatos = evaluacion.resultado.detalle;
        } else {
          resultado = evaluacion.resultado;
        }
      } else {
        motivoSinDatos =
          "La solicitud no tiene los datos de viaje completos (distancia, pasajeros o tipo de vehículo) para recalcular la comparación.";
      }

      const medioRecomendado = resultado?.recomendada ?? solicitud.modalidadRequerida;
      const ahorroEstimado = resultado ? calcularAhorroEstimado(resultado, medioRecomendado) : 0;
      const fechaSalida = combinarFechaHora(solicitud.fechaSolicitud, solicitud.horaInicioDeseada);
      const horasHastaSalida = (fechaSalida.getTime() - ahora) / (1000 * 60 * 60);

      return {
        solicitud,
        solicitanteNombre: nombrePorId.get(solicitud.usuarioSolicitanteId) ?? "Usuario desconocido",
        territorioNombre: territorio?.nombre ?? solicitud.territorioId,
        resultado,
        motivoSinDatos,
        medioRecomendado,
        ahorroEstimado,
        esUrgente: horasHastaSalida <= PARAMS_CONFIG.umbralUrgenciaAprobacionHoras,
        horasHastaSalida,
      };
    })
  );

  return items.sort((a, b) => a.horasHastaSalida - b.horasHastaSalida);
}

async function obtenerOCrearAprobacionPendiente(
  solicitud: Solicitud,
  aprobadorId: string,
  ahora: string
): Promise<Aprobacion> {
  const existentes = await db.aprobaciones.where("solicitudId").equals(solicitud.id).toArray();
  const pendiente = existentes.find((a) => a.decision === "PENDIENTE");
  if (pendiente) return pendiente;

  const nueva: Aprobacion = {
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: aprobadorId,
    estatus: "ACTIVO",
    solicitudId: solicitud.id,
    aprobadorId,
    decision: "PENDIENTE",
    reglaAplicada: solicitud.motivoAprobacionEspecial ?? "Aprobación especial",
    fechaDecision: ahora,
  };
  return aprobacionesRepository.create(nueva);
}

async function registrarAuditoria(
  solicitudId: string,
  usuarioId: string,
  accion: string,
  cambios: Record<string, unknown>,
  ahora: string
): Promise<void> {
  await registrosAuditoriaRepository.create({
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioId,
    estatus: "ACTIVO",
    entidad: "Solicitud",
    entidadId: solicitudId,
    accion,
    usuarioId,
    cambiosJson: JSON.stringify(cambios),
    fechaCambio: ahora,
  });
}

export type DecisionAprobador = "APROBAR" | "RECHAZAR" | "SOLICITAR_CAMBIOS";

export interface DecisionInput {
  solicitudId: string;
  aprobadorId: string;
  decision: DecisionAprobador;
  /** Obligatorio para RECHAZAR y SOLICITAR_CAMBIOS; opcional para APROBAR. */
  comentario: string;
}

export interface DecisionExito {
  solicitud: Solicitud;
  reservacion?: Reservacion;
}

/**
 * Aplica la decisión del aprobador sobre una solicitud pendiente:
 * - APROBAR: dispara el motor de asignación (Chunk 5) cuando el medio
 *   recomendado es Pool/Asignado (pasa a "Vehículo asignado"), o aprueba
 *   directo cuando el medio es Uber (pasa a "Aprobada"; cotización simulada).
 * - RECHAZAR: pasa a "Rechazada"; el comentario queda visible para el
 *   colaborador en Mis reservaciones.
 * - SOLICITAR_CAMBIOS: regresa la solicitud a un estado editable
 *   ("Borrador") y notifica (simulado) al colaborador con el comentario.
 * Toda decisión queda registrada en RegistroAuditoria.
 */
export async function decidirSolicitud(input: DecisionInput): Promise<DecisionExito | ResultadoSinDatos> {
  const comentario = input.comentario.trim();
  if ((input.decision === "RECHAZAR" || input.decision === "SOLICITAR_CAMBIOS") && comentario.length === 0) {
    return crearResultadoSinDatos("El comentario es obligatorio para esta decisión");
  }

  const solicitud = await solicitudesRepository.getById(input.solicitudId);
  if (!solicitud) {
    return crearResultadoSinDatos(`No existe la solicitud ${input.solicitudId}`);
  }
  if (solicitud.estadoSolicitud !== "PENDIENTE_APROBACION") {
    return crearResultadoSinDatos("Esta solicitud ya no está pendiente de aprobación");
  }

  const ahora = new Date().toISOString();
  const aprobacionPendiente = await obtenerOCrearAprobacionPendiente(solicitud, input.aprobadorId, ahora);

  if (input.decision === "RECHAZAR") {
    const solicitudActualizada = await solicitudesRepository.update(solicitud.id, {
      estadoSolicitud: "RECHAZADA",
      fechaActualizacion: ahora,
    });
    await aprobacionesRepository.update(aprobacionPendiente.id, {
      decision: "RECHAZADA",
      comentario,
      aprobadorId: input.aprobadorId,
      fechaDecision: ahora,
      fechaActualizacion: ahora,
    });
    await registrarAuditoria(solicitud.id, input.aprobadorId, "RECHAZO", { decision: "RECHAZADA", comentario }, ahora);
    await notificarSolicitudRechazada(solicitud.usuarioSolicitanteId, solicitud.folio, solicitud.id, comentario);
    return { solicitud: solicitudActualizada as Solicitud };
  }

  if (input.decision === "SOLICITAR_CAMBIOS") {
    const solicitudActualizada = await solicitudesRepository.update(solicitud.id, {
      estadoSolicitud: "BORRADOR",
      fechaActualizacion: ahora,
    });
    await aprobacionesRepository.update(aprobacionPendiente.id, {
      comentario,
      fechaActualizacion: ahora,
    });
    await proveedorNotificaciones.notificar({
      usuarioDestinoId: solicitud.usuarioSolicitanteId,
      tipo: "SOLICITUD_CAMBIOS",
      solicitudId: solicitud.id,
      mensaje: comentario,
    });
    await registrarAuditoria(solicitud.id, input.aprobadorId, "SOLICITUD_CAMBIOS", { comentario }, ahora);
    return { solicitud: solicitudActualizada as Solicitud };
  }

  // APROBAR: usa el mismo medio recomendado que se le mostró al aprobador
  // (recalculado con servicioComparador); si no se puede recalcular, respeta
  // el medio que el colaborador solicitó originalmente.
  const datosEvaluacion = construirDatosEvaluacion(solicitud);
  let medioRecomendado: Alternativa = solicitud.modalidadRequerida;
  if (datosEvaluacion) {
    const evaluacion = await evaluarAlternativasParaSolicitud(
      datosEvaluacion,
      PARAMS_CONFIG.limitesCostoEspecial.colaborador
    );
    if (!esResultadoSinDatos(evaluacion.resultado)) {
      medioRecomendado = evaluacion.resultado.recomendada;
    }
  }

  let reservacion: Reservacion | undefined;
  let estadoFinal: EstadoSolicitud;
  let confirmacionUberMensaje: string | undefined;

  if (medioRecomendado === "UBER") {
    estadoFinal = "APROBADA";
    const confirmacionUber = await proveedorUber.solicitarViaje({
      km: solicitud.distanciaEstimadaKm ?? 0,
      duracionMinutos: solicitud.duracionEstimadaMinutos,
      origen: solicitud.origen,
      destino: solicitud.destino,
      pasajero: solicitud.usuarioSolicitanteId,
    });
    confirmacionUberMensaje = confirmacionUber.mensaje;
  } else {
    const fechaSalida = datosEvaluacion?.fechaSalida ?? combinarFechaHora(solicitud.fechaSolicitud, solicitud.horaInicioDeseada);
    const fechaRegreso =
      datosEvaluacion?.fechaRegreso ??
      combinarFechaHora(solicitud.fechaRegreso ?? solicitud.fechaSolicitud, solicitud.horaFinDeseada);

    const solicitudAsignacion: SolicitudAsignacion = {
      territorio: solicitud.territorioId,
      origen: solicitud.territorioId,
      fechaSalida,
      fechaRegreso,
      tipoVehiculoRequerido: esTipoVehiculoValido(solicitud.tipoVehiculoRequerido)
        ? solicitud.tipoVehiculoRequerido
        : medioRecomendado === "POOL"
          ? "sedan-compacto"
          : "sedan-ejecutivo",
      pasajeros: solicitud.pasajeros && solicitud.pasajeros > 0 ? solicitud.pasajeros : 1,
    };

    const resultadoAsignacion = await asignarVehiculoDeFlota(solicitud.territorioId, medioRecomendado, solicitudAsignacion);
    if (esResultadoSinDatos(resultadoAsignacion)) {
      return crearResultadoSinDatos(`No se pudo asignar automáticamente una unidad: ${resultadoAsignacion.detalle}`);
    }

    reservacion = await reservacionesRepository.create({
      id: crypto.randomUUID(),
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
      usuarioCreadorId: input.aprobadorId,
      estatus: "ACTIVO",
      solicitudId: solicitud.id,
      vehiculoId: resultadoAsignacion.recomendado.vehiculo.id,
      modalidadAsignada: medioRecomendado,
      fechaInicio: fechaSalida.toISOString(),
      fechaFin: fechaRegreso.toISOString(),
      costoEstimado: solicitud.costoEstimado ?? 0,
      costoReal: 0,
      estadoReservacion: "ASIGNADA",
    });
    estadoFinal = "ASIGNADA";
  }

  const solicitudActualizada = await solicitudesRepository.update(solicitud.id, {
    estadoSolicitud: estadoFinal,
    fechaActualizacion: ahora,
  });
  await aprobacionesRepository.update(aprobacionPendiente.id, {
    decision: "APROBADA",
    comentario: comentario || undefined,
    aprobadorId: input.aprobadorId,
    fechaDecision: ahora,
    fechaActualizacion: ahora,
  });
  await registrarAuditoria(
    solicitud.id,
    input.aprobadorId,
    "APROBACION",
    { decision: "APROBADA", medio: medioRecomendado, comentario },
    ahora
  );

  await notificarSolicitudAprobada(solicitud.usuarioSolicitanteId, solicitud.folio, solicitud.id, confirmacionUberMensaje);
  if (reservacion) {
    const vehiculoAsignado = await db.vehiculos.get(reservacion.vehiculoId);
    const vehiculoNombre = vehiculoAsignado ? `${vehiculoAsignado.marca} ${vehiculoAsignado.modelo} (${vehiculoAsignado.placa})` : reservacion.vehiculoId;
    await notificarVehiculoAsignado(solicitud.usuarioSolicitanteId, solicitud.folio, solicitud.id, vehiculoNombre);
  }

  return { solicitud: solicitudActualizada as Solicitud, reservacion };
}
