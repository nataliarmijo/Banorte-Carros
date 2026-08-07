/**
 * Adaptador entre los modelos persistidos (Dexie) y los servicios puros de
 * negocio (servicioComparador, servicioAsignacion). Aquí sí se consultan
 * repositorios: los servicios en /lib/services permanecen desacoplados de la
 * capa de datos y de la UI.
 */

import { db } from "@/lib/repositories/dexie";
import type { ModalidadVehiculo, Vehiculo } from "@/lib/models";
import type { TipoCombustible } from "@/lib/config/costos";
import { ASIGNACION_CONFIG } from "@/lib/config/asignacion";
import { PARAMS_CONFIG } from "@/lib/config/params";
import {
  estaDisponibleParaPeriodo,
  recomendarVehiculo,
  type EstadoOperativoVehiculo,
  type PeriodoReservado,
  type ResultadoAsignacion,
  type SolicitudAsignacion,
  type VehiculoCandidato,
} from "@/lib/services/servicioAsignacion";
import { compararAlternativas } from "@/lib/services/servicio-comparador";
import type {
  BorradorSolicitud,
  ResultadoComparacion,
  ResultadoSinDatos,
  TipoVehiculo,
  VehiculoDisponible,
} from "@/lib/services/types";

/** Estados de reservación que ocupan al vehículo (no cancelada/completada). */
const ESTADOS_RESERVACION_ACTIVOS = new Set([
  "BORRADOR",
  "PENDIENTE_APROBACION",
  "APROBADA",
  "ASIGNADA",
  "LISTA_CHECK_IN",
  "EN_CURSO",
]);

/** Mapea el tipo libre capturado en el catálogo de vehículos al catálogo cerrado que usan los servicios de costos/emisiones. */
export function mapTipoVehiculo(vehiculo: Vehiculo): TipoVehiculo {
  if (vehiculo.tipoVehiculo.toLowerCase().includes("suv")) return "suv-asignado";
  return vehiculo.modalidad === "ASIGNADO" ? "sedan-ejecutivo" : "sedan-compacto";
}

/** Mapea el combustible libre del catálogo al enum cerrado de servicioEmisiones/servicioCostos. */
export function mapTipoCombustible(combustibleTipo: string): TipoCombustible {
  const valor = combustibleTipo.trim().toLowerCase();
  if (valor.includes("dies")) return "DIESEL";
  if (valor.includes("elect") || valor.includes("eléct")) return "ELECTRICO";
  if (valor.includes("hibr") || valor.includes("híbr")) return "HIBRIDO";
  return "GASOLINA";
}

export interface CandidatoFlota extends VehiculoCandidato {
  modalidad: ModalidadVehiculo;
  tipoCombustible: TipoCombustible;
}

/**
 * Lee del repositorio los vehículos Pool/Asignado de un territorio y arma
 * los candidatos con las métricas reales (reservaciones, mantenimientos,
 * incidencias) que necesitan servicioComparador y servicioAsignacion.
 */
export async function construirCandidatosFlota(territorioId: string): Promise<CandidatoFlota[]> {
  const vehiculosTerritorio = await db.vehiculos.where("territorioId").equals(territorioId).toArray();
  const vehiculosFlota = vehiculosTerritorio.filter((v) => v.modalidad === "POOL" || v.modalidad === "ASIGNADO");
  if (vehiculosFlota.length === 0) return [];

  const ahora = new Date();
  const msPorDia = 24 * 60 * 60 * 1000;
  const ventanaUtilizacionMs = ASIGNACION_CONFIG.utilizacion.ventanaDias * msPorDia;
  const ventanaIncidenciasMs = ASIGNACION_CONFIG.incidencias.ventanaDias * msPorDia;

  return Promise.all(
    vehiculosFlota.map(async (vehiculo): Promise<CandidatoFlota> => {
      const [reservacionesVehiculo, mantenimientosVehiculo, incidenciasVehiculo] = await Promise.all([
        db.reservaciones.where("vehiculoId").equals(vehiculo.id).toArray(),
        db.mantenimientos.where("vehiculoId").equals(vehiculo.id).toArray(),
        db.incidencias.where("vehiculoId").equals(vehiculo.id).toArray(),
      ]);

      const reservacionesExistentes: PeriodoReservado[] = reservacionesVehiculo
        .filter((r) => ESTADOS_RESERVACION_ACTIVOS.has(r.estadoReservacion))
        .map((r) => ({ fechaInicio: new Date(r.fechaInicio), fechaFin: new Date(r.fechaFin) }));

      const viajesRecientes = reservacionesVehiculo.filter(
        (r) => ahora.getTime() - new Date(r.fechaInicio).getTime() <= ventanaUtilizacionMs
      ).length;

      const proximosMantenimientos = mantenimientosVehiculo
        .filter((m) => !m.fechaRealizada && new Date(m.fechaProgramada).getTime() >= ahora.getTime())
        .sort((a, b) => new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime());
      const diasHastaProximoMantenimiento =
        proximosMantenimientos.length > 0
          ? Math.round(
              (new Date(proximosMantenimientos[0].fechaProgramada).getTime() - ahora.getTime()) / msPorDia
            )
          : null;

      const incidenciasRecientes = incidenciasVehiculo.filter(
        (i) => ahora.getTime() - new Date(i.fechaCreacion).getTime() <= ventanaIncidenciasMs
      ).length;

      return {
        id: vehiculo.id,
        nombre: `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})`,
        tipoVehiculo: mapTipoVehiculo(vehiculo),
        territorioId: vehiculo.territorioId,
        capacidadPasajeros: vehiculo.capacidadPasajeros,
        disponibilidadActual: vehiculo.disponibilidadActual,
        estadoOperativo: vehiculo.estadoOperativo as EstadoOperativoVehiculo,
        kilometrajeActual: vehiculo.kilometrajeActual,
        reservacionesExistentes,
        viajesRecientes,
        diasHastaProximoMantenimiento,
        incidenciasRecientes,
        modalidad: vehiculo.modalidad,
        tipoCombustible: mapTipoCombustible(vehiculo.combustibleTipo),
      };
    })
  );
}

/**
 * Convierte candidatos de flota en VehiculoDisponible para servicioComparador,
 * usando el filtro de disponibilidad obligatoria de servicioAsignacion
 * (sin traslapes, no bloqueados, no en mantenimiento) sobre el periodo
 * completo de la solicitud.
 */
export function construirVehiculosDisponibles(
  candidatos: CandidatoFlota[],
  fechaSalida: Date,
  fechaRegreso: Date
): VehiculoDisponible[] {
  return candidatos.map((candidato) => ({
    id: candidato.id,
    nombre: candidato.nombre,
    tipo: candidato.modalidad === "POOL" ? "POOL" : "ASIGNADO",
    tipoVehiculo: candidato.tipoVehiculo,
    tipoCombustible: candidato.tipoCombustible,
    territorio: candidato.territorioId,
    disponible: estaDisponibleParaPeriodo(candidato, fechaSalida, fechaRegreso),
    capacidad: candidato.capacidadPasajeros,
  }));
}

export interface DatosEvaluacion {
  territorio: string;
  distanciaEstimadaKm: number;
  duracionEstimadaMinutos?: number;
  fechaSalida: Date;
  fechaRegreso: Date;
  pasajeros: number;
  tipoVehiculoRequerido: TipoVehiculo;
}

export interface EvaluacionAlternativas {
  resultado: ResultadoComparacion | ResultadoSinDatos;
  candidatos: CandidatoFlota[];
  vehiculosDisponibles: VehiculoDisponible[];
}

/**
 * Punto de entrada único para el wizard: arma la flota candidata del
 * territorio y ejecuta servicioComparador (Chunk 4) usando el filtro de
 * disponibilidad de servicioAsignacion (Chunk 5).
 */
export async function evaluarAlternativasParaSolicitud(
  datos: DatosEvaluacion,
  limiteCostoAprobacion: number
): Promise<EvaluacionAlternativas> {
  const candidatos = await construirCandidatosFlota(datos.territorio);
  const vehiculosDisponibles = construirVehiculosDisponibles(candidatos, datos.fechaSalida, datos.fechaRegreso);

  const borrador: BorradorSolicitud = {
    territorioOrigen: datos.territorio,
    territorioDestino: datos.territorio,
    distanciaEstimadaKm: datos.distanciaEstimadaKm,
    fecha: datos.fechaSalida,
    horaEstimada: datos.fechaSalida.getHours(),
    pasajeros: datos.pasajeros,
    tipoVehiculoRequerido: datos.tipoVehiculoRequerido,
    duracionEstimadaMinutos: datos.duracionEstimadaMinutos,
  };

  const resultado = compararAlternativas(borrador, vehiculosDisponibles, { limiteCostoAprobacion });

  return { resultado, candidatos, vehiculosDisponibles };
}

/** Porcentaje de ocupación de la flotilla Pool/Asignado de un territorio para la ventana solicitada. */
export function calcularSaturacionFlotilla(vehiculosDisponibles: VehiculoDisponible[]): {
  ocupacionPorcentaje: number;
  etiqueta: string;
  disponibles: number;
  total: number;
} {
  const total = vehiculosDisponibles.length;
  if (total === 0) {
    return { ocupacionPorcentaje: 0, etiqueta: "Sin unidades registradas en el territorio", disponibles: 0, total: 0 };
  }

  const disponibles = vehiculosDisponibles.filter((v) => v.disponible).length;
  const ocupacionPorcentaje = Math.round(((total - disponibles) / total) * 100);
  const { umbralAltoPorcentaje, umbralModeradoPorcentaje } = PARAMS_CONFIG.saturacionFlotilla;
  const etiqueta =
    ocupacionPorcentaje >= umbralAltoPorcentaje
      ? "Flotilla saturada"
      : ocupacionPorcentaje >= umbralModeradoPorcentaje
        ? "Demanda moderada"
        : "Disponibilidad amplia";

  return { ocupacionPorcentaje, etiqueta, disponibles, total };
}

/** Resumen en lenguaje simple del estado de mantenimiento relevante de la flotilla del territorio. */
export function resumenMantenimientoRelevante(candidatos: CandidatoFlota[]): string {
  const enMantenimiento = candidatos.filter((c) => c.estadoOperativo === "EN_MANTENIMIENTO").length;
  const proximos = candidatos.filter(
    (c) =>
      c.diasHastaProximoMantenimiento !== null &&
      c.diasHastaProximoMantenimiento <= ASIGNACION_CONFIG.mantenimiento.diasUmbralRiesgo
  ).length;

  if (enMantenimiento === 0 && proximos === 0) {
    return "Sin unidades en mantenimiento ni próximas a entrar a taller.";
  }

  const partes: string[] = [];
  if (enMantenimiento > 0) partes.push(`${enMantenimiento} unidad(es) en mantenimiento`);
  if (proximos > 0) partes.push(`${proximos} unidad(es) próxima(s) a mantenimiento`);
  return partes.join(" · ");
}

/**
 * Ejecuta el motor de asignación inteligente (Chunk 5) para elegir la unidad
 * específica dentro de la modalidad (Pool o Asignado) ya decidida por el
 * usuario, al momento de confirmar la solicitud.
 */
export async function asignarVehiculoDeFlota(
  territorioId: string,
  modalidad: "POOL" | "ASIGNADO",
  solicitudAsignacion: SolicitudAsignacion
): Promise<ResultadoAsignacion | ResultadoSinDatos> {
  const candidatos = await construirCandidatosFlota(territorioId);
  const candidatosModalidad = candidatos.filter((c) => c.modalidad === modalidad);
  return recomendarVehiculo(solicitudAsignacion, candidatosModalidad);
}
