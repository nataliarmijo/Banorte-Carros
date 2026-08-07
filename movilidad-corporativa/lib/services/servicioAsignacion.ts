/**
 * servicioAsignacion
 * Motor de asignación inteligente de vehículos: dado un borrador de
 * solicitud y la flota candidata, filtra los vehículos obligatoriamente
 * disponibles para el periodo solicitado y los ordena con un puntaje
 * ponderado configurable (/lib/config/asignacion.ts).
 *
 * También expone `reasignarManualmente` para que un administrador
 * sobreescriba la recomendación, dejando registro en auditoría.
 */

import { ASIGNACION_CONFIG } from "@/lib/config/asignacion";
import { PARAMS_CONFIG } from "@/lib/config/params";
import type { RegistroAuditoria, Reservacion } from "@/lib/models";
import {
  registrosAuditoriaRepository,
  reservacionesRepository,
} from "@/lib/repositories/typed-repositories";
import { crearResultadoSinDatos } from "./types";
import type { ResultadoSinDatos, TipoVehiculo } from "./types";

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

/** Periodo ya reservado para un vehículo (de otras reservaciones activas). */
export interface PeriodoReservado {
  fechaInicio: Date;
  fechaFin: Date;
}

export type EstadoOperativoVehiculo = "DISPONIBLE" | "OCUPADO" | "EN_MANTENIMIENTO" | "FUERA_DE_SERVICIO";

/**
 * Vehículo candidato a asignación, con las métricas que el motor necesita
 * para filtrar y puntuar. El llamador (repositorios / capa de datos) es
 * responsable de construir esta lista; este servicio no consulta la base de
 * datos directamente, por lo que es puro y fácil de probar.
 */
export interface VehiculoCandidato {
  id: string;
  nombre: string;
  tipoVehiculo: TipoVehiculo;
  territorioId: string;
  capacidadPasajeros: number;
  disponibilidadActual: boolean;
  estadoOperativo: EstadoOperativoVehiculo;
  kilometrajeActual: number;
  /** Reservaciones existentes que ocupan al vehículo (para detectar traslapes). */
  reservacionesExistentes: PeriodoReservado[];
  /** Viajes realizados dentro de la ventana reciente configurada (utilización). */
  viajesRecientes: number;
  /** Días hasta el próximo mantenimiento programado; null si no hay ninguno agendado. */
  diasHastaProximoMantenimiento: number | null;
  /** Incidencias reportadas dentro de la ventana reciente configurada. */
  incidenciasRecientes: number;
}

export interface SolicitudAsignacion {
  territorio: string;
  origen: string; // territorio/ubicación de recolección
  fechaSalida: Date;
  fechaRegreso: Date;
  tipoVehiculoRequerido: TipoVehiculo;
  pasajeros: number;
}

export interface DesglosePuntaje {
  compatibilidad: number;
  proximidad: number;
  utilizacion: number;
  balanceKilometraje: number;
  riesgoMantenimiento: number;
  incidencias: number;
}

export interface VehiculoPuntuado {
  vehiculo: VehiculoCandidato;
  puntajeTotal: number; // 0-100
  /** Puntaje 0-1 de cada criterio, antes de aplicar su peso. */
  desglose: DesglosePuntaje;
}

export interface ResultadoAsignacion {
  recomendado: VehiculoPuntuado;
  /** Segundo y tercer lugar, en ese orden (puede tener 0, 1 o 2 elementos). */
  alternativas: VehiculoPuntuado[];
  totalCandidatosDisponibles: number;
  esEstimado: boolean;
  notas: string[];
}

// ---------------------------------------------------------------------------
// Filtro obligatorio: disponibilidad durante todo el periodo solicitado
// ---------------------------------------------------------------------------

function seSuperponen(periodo: PeriodoReservado, fechaInicio: Date, fechaFin: Date): boolean {
  return periodo.fechaInicio < fechaFin && fechaInicio < periodo.fechaFin;
}

/**
 * Verifica el único requisito obligatorio: que el vehículo esté disponible
 * durante todo el periodo solicitado (sin traslapes, no bloqueado, no en
 * mantenimiento). No evalúa compatibilidad de tipo/capacidad: eso es un
 * criterio ponderado, no un filtro.
 */
export function estaDisponibleParaPeriodo(
  vehiculo: VehiculoCandidato,
  fechaSalida: Date,
  fechaRegreso: Date
): boolean {
  if (!vehiculo.disponibilidadActual) return false;
  if (vehiculo.estadoOperativo === "EN_MANTENIMIENTO") return false;
  if (vehiculo.estadoOperativo === "FUERA_DE_SERVICIO") return false;
  return !vehiculo.reservacionesExistentes.some((periodo) =>
    seSuperponen(periodo, fechaSalida, fechaRegreso)
  );
}

// ---------------------------------------------------------------------------
// Criterios de puntaje (cada uno independiente, retorna 0-1)
// ---------------------------------------------------------------------------

/** Compatibilidad del vehículo con lo solicitado (tipo + capacidad). */
export function puntajeCompatibilidad(
  vehiculo: VehiculoCandidato,
  solicitud: SolicitudAsignacion
): number {
  const tipoCoincide = vehiculo.tipoVehiculo === solicitud.tipoVehiculoRequerido ? 1 : 0;
  const capacidadSuficiente =
    solicitud.pasajeros <= 0 ? 1 : clamp(vehiculo.capacidadPasajeros / solicitud.pasajeros, 0, 1);
  return (tipoCoincide + capacidadSuficiente) / 2;
}

function distanciaHaversineKm(
  a: { latitud: number; longitud: number },
  b: { latitud: number; longitud: number }
): number {
  const radioTierraKm = 6371;
  const dLat = ((b.latitud - a.latitud) * Math.PI) / 180;
  const dLon = ((b.longitud - a.longitud) * Math.PI) / 180;
  const lat1 = (a.latitud * Math.PI) / 180;
  const lat2 = (b.latitud * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radioTierraKm * Math.asin(Math.sqrt(clamp(h, 0, 1)));
}

/** Proximidad del vehículo al origen solicitado (favorece distancias cortas). */
export function puntajeProximidad(
  vehiculo: VehiculoCandidato,
  solicitud: SolicitudAsignacion
): number {
  if (vehiculo.territorioId === solicitud.origen) return 1;

  const territorios = PARAMS_CONFIG.territorios as Record<
    string,
    { latitud: number; longitud: number }
  >;
  const origenCoords = territorios[solicitud.origen];
  const vehiculoCoords = territorios[vehiculo.territorioId];

  if (!origenCoords || !vehiculoCoords) {
    return ASIGNACION_CONFIG.proximidad.valorPorDefectoSinDatos;
  }

  const distanciaKm = distanciaHaversineKm(origenCoords, vehiculoCoords);
  return clamp(1 - distanciaKm / ASIGNACION_CONFIG.proximidad.distanciaMaximaReferenciaKm, 0, 1);
}

/** Menor utilización reciente (favorece vehículos poco usados últimamente). */
export function puntajeUtilizacion(vehiculo: VehiculoCandidato): number {
  const { viajesMaximosEsperados } = ASIGNACION_CONFIG.utilizacion;
  if (viajesMaximosEsperados <= 0) return 1;
  return clamp(1 - vehiculo.viajesRecientes / viajesMaximosEsperados, 0, 1);
}

/**
 * Balance de kilometraje: favorece vehículos con menos km acumulado en
 * relación con el resto de los candidatos disponibles (min-max dentro del
 * lote, no un umbral absoluto).
 */
export function puntajeBalanceKilometraje(
  vehiculo: VehiculoCandidato,
  candidatosDisponibles: VehiculoCandidato[]
): number {
  const kilometrajes = candidatosDisponibles.map((v) => v.kilometrajeActual);
  const kmMin = Math.min(...kilometrajes);
  const kmMax = Math.max(...kilometrajes);
  if (kmMax === kmMin) return 1;
  return clamp(1 - (vehiculo.kilometrajeActual - kmMin) / (kmMax - kmMin), 0, 1);
}

/** Riesgo de mantenimiento: favorece vehículos que NO están próximos a mantenimiento. */
export function puntajeRiesgoMantenimiento(vehiculo: VehiculoCandidato): number {
  if (vehiculo.diasHastaProximoMantenimiento === null) return 1;
  const { diasUmbralRiesgo } = ASIGNACION_CONFIG.mantenimiento;
  if (diasUmbralRiesgo <= 0) return 1;
  return clamp(vehiculo.diasHastaProximoMantenimiento / diasUmbralRiesgo, 0, 1);
}

/** Ausencia de incidencias recientes (favorece vehículos sin incidencias). */
export function puntajeIncidencias(vehiculo: VehiculoCandidato): number {
  const { maximasEsperadas } = ASIGNACION_CONFIG.incidencias;
  if (maximasEsperadas <= 0) return 1;
  return clamp(1 - vehiculo.incidenciasRecientes / maximasEsperadas, 0, 1);
}

export function puntuarVehiculo(
  vehiculo: VehiculoCandidato,
  solicitud: SolicitudAsignacion,
  candidatosDisponibles: VehiculoCandidato[]
): VehiculoPuntuado {
  const desglose: DesglosePuntaje = {
    compatibilidad: puntajeCompatibilidad(vehiculo, solicitud),
    proximidad: puntajeProximidad(vehiculo, solicitud),
    utilizacion: puntajeUtilizacion(vehiculo),
    balanceKilometraje: puntajeBalanceKilometraje(vehiculo, candidatosDisponibles),
    riesgoMantenimiento: puntajeRiesgoMantenimiento(vehiculo),
    incidencias: puntajeIncidencias(vehiculo),
  };

  const { pesos } = ASIGNACION_CONFIG;
  const puntajeTotal =
    (desglose.compatibilidad * pesos.compatibilidad +
      desglose.proximidad * pesos.proximidad +
      desglose.utilizacion * pesos.utilizacion +
      desglose.balanceKilometraje * pesos.balanceKilometraje +
      desglose.riesgoMantenimiento * pesos.riesgoMantenimiento +
      desglose.incidencias * pesos.incidencias) *
    100;

  return { vehiculo, puntajeTotal, desglose };
}

// ---------------------------------------------------------------------------
// Recomendación
// ---------------------------------------------------------------------------

/**
 * Filtra la flota candidata por disponibilidad obligatoria y devuelve el
 * vehículo recomendado (mejor puntaje ponderado) junto con la 2a y 3a mejor
 * alternativa.
 */
export function recomendarVehiculo(
  solicitud: SolicitudAsignacion,
  vehiculosCandidatos: VehiculoCandidato[]
): ResultadoAsignacion | ResultadoSinDatos {
  if (
    !(solicitud.fechaSalida instanceof Date) ||
    !(solicitud.fechaRegreso instanceof Date) ||
    Number.isNaN(solicitud.fechaSalida.getTime()) ||
    Number.isNaN(solicitud.fechaRegreso.getTime())
  ) {
    return crearResultadoSinDatos("Las fechas de salida y regreso no son válidas");
  }
  if (solicitud.fechaRegreso <= solicitud.fechaSalida) {
    return crearResultadoSinDatos("La fecha de regreso debe ser posterior a la fecha de salida");
  }
  if (!Number.isFinite(solicitud.pasajeros) || solicitud.pasajeros <= 0) {
    return crearResultadoSinDatos("El número de pasajeros no es válido");
  }
  if (vehiculosCandidatos.length === 0) {
    return crearResultadoSinDatos("No hay vehículos registrados para evaluar");
  }

  const disponibles = vehiculosCandidatos.filter((vehiculo) =>
    estaDisponibleParaPeriodo(vehiculo, solicitud.fechaSalida, solicitud.fechaRegreso)
  );

  if (disponibles.length === 0) {
    return crearResultadoSinDatos(
      "Ningún vehículo está disponible para el periodo solicitado (todos ocupados, bloqueados o en mantenimiento)"
    );
  }

  const puntuados = disponibles
    .map((vehiculo) => puntuarVehiculo(vehiculo, solicitud, disponibles))
    .sort((a, b) => b.puntajeTotal - a.puntajeTotal);

  const excluidos = vehiculosCandidatos.length - disponibles.length;

  return {
    recomendado: puntuados[0],
    alternativas: puntuados.slice(1, 3),
    totalCandidatosDisponibles: disponibles.length,
    esEstimado: true,
    notas:
      excluidos > 0
        ? [`${excluidos} vehículo(s) excluido(s) por no estar disponibles en el periodo solicitado`]
        : [],
  };
}

// ---------------------------------------------------------------------------
// Reasignación manual (con auditoría)
// ---------------------------------------------------------------------------

export interface ResultadoReasignacion {
  exito: true;
  reservacion: Reservacion;
  registroAuditoria: RegistroAuditoria;
}

/**
 * Reasigna manualmente el vehículo de una reservación, exigiendo una
 * justificación y dejando registro en auditoría (quién, cuándo, vehículo
 * anterior, vehículo nuevo, motivo).
 */
export async function reasignarManualmente(
  solicitudId: string,
  vehiculoNuevoId: string,
  justificacion: string,
  usuarioId: string
): Promise<ResultadoReasignacion | ResultadoSinDatos> {
  if (!justificacion || justificacion.trim().length === 0) {
    return crearResultadoSinDatos(
      "La justificación es obligatoria para reasignar manualmente un vehículo"
    );
  }

  const reservacionesDeLaSolicitud = await reservacionesRepository.list({
    filters: { solicitudId } as Partial<Reservacion>,
  });
  const reservacion = reservacionesDeLaSolicitud[0];
  if (!reservacion) {
    return crearResultadoSinDatos(`No existe una reservación para la solicitud ${solicitudId}`);
  }

  const vehiculoAnteriorId = reservacion.vehiculoId;
  const ahora = new Date().toISOString();

  const reservacionActualizada = await reservacionesRepository.update(reservacion.id, {
    vehiculoId: vehiculoNuevoId,
  });
  if (!reservacionActualizada) {
    return crearResultadoSinDatos(`No se pudo actualizar la reservación ${reservacion.id}`);
  }

  const registroAuditoria: RegistroAuditoria = {
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioId,
    estatus: "ACTIVO",
    entidad: "Reservacion",
    entidadId: reservacion.id,
    accion: "REASIGNACION_MANUAL",
    usuarioId,
    cambiosJson: JSON.stringify({
      vehiculoAnteriorId,
      vehiculoNuevoId,
      justificacion,
    }),
    fechaCambio: ahora,
  };

  await registrosAuditoriaRepository.create(registroAuditoria);

  return {
    exito: true,
    reservacion: reservacionActualizada,
    registroAuditoria,
  };
}

export const servicioAsignacion = {
  recomendarVehiculo,
  reasignarManualmente,
  estaDisponibleParaPeriodo,
  puntajeCompatibilidad,
  puntajeProximidad,
  puntajeUtilizacion,
  puntajeBalanceKilometraje,
  puntajeRiesgoMantenimiento,
  puntajeIncidencias,
};
