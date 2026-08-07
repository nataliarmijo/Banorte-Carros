/**
 * servicioCheckOut
 * Reglas puras del check-out digital: validación de los datos capturados al
 * devolver el vehículo, y cálculo de las cifras reales del viaje (km
 * recorridos, duración real, retraso frente al regreso planeado, diferencia
 * de combustible, y si el uso ocurrió fuera de horario laboral sin estar
 * autorizado por la aprobación original).
 */

import { PARAMS_CONFIG } from "@/lib/config/params";
import { CHECKOUT_CONFIG } from "@/lib/config/checkout";
import type { EstadoVehiculoDevolucion } from "@/lib/models";

export interface DatosCheckOut {
  kilometrajeFinal: number;
  kilometrajeInicial: number;
  combustibleRestante: number;
  fotos: string[];
  estadoVehiculo: EstadoVehiculoDevolucion;
  llavesDevueltas: boolean;
  danosDescripcion?: string;
}

export interface ResultadoValidacionCheckOut {
  valido: boolean;
  errores: string[];
}

/** Valida los datos capturados en el check-out; agrega un mensaje claro por cada dato obligatorio faltante o inválido. */
export function validarDatosCheckOut(datos: DatosCheckOut): ResultadoValidacionCheckOut {
  const errores: string[] = [];

  if (!Number.isFinite(datos.kilometrajeFinal) || datos.kilometrajeFinal <= 0) {
    errores.push("Ingresa un kilometraje final válido.");
  } else if (datos.kilometrajeFinal < datos.kilometrajeInicial) {
    errores.push(
      `El kilometraje final (${datos.kilometrajeFinal} km) no puede ser menor al inicial (${datos.kilometrajeInicial} km).`
    );
  }

  if (!Number.isFinite(datos.combustibleRestante) || datos.combustibleRestante < 0 || datos.combustibleRestante > 100) {
    errores.push("Indica el nivel de combustible final (0-100%).");
  }

  if (datos.fotos.length < CHECKOUT_CONFIG.fotosMinimas) {
    errores.push(
      CHECKOUT_CONFIG.fotosMinimas === 1
        ? "Carga al menos una fotografía del vehículo al devolverlo."
        : `Carga al menos ${CHECKOUT_CONFIG.fotosMinimas} fotografías del vehículo al devolverlo.`
    );
  }

  if (!datos.llavesDevueltas) {
    errores.push("Confirma la devolución de llaves para completar el check-out.");
  }

  if (datos.estadoVehiculo === "CON_DANOS" && (!datos.danosDescripcion || datos.danosDescripcion.trim().length === 0)) {
    errores.push("Describe los daños reportados para poder registrarlos.");
  }

  return { valido: errores.length === 0, errores };
}

export function calcularKilometrosRecorridos(kilometrajeInicial: number, kilometrajeFinal: number): number {
  return Math.max(0, kilometrajeFinal - kilometrajeInicial);
}

/** Duración real del viaje, en minutos, del check-in al check-out. */
export function calcularDuracionRealMinutos(fechaHoraCheckInISO: string, fechaHoraCheckOutISO: string): number {
  const inicio = new Date(fechaHoraCheckInISO).getTime();
  const fin = new Date(fechaHoraCheckOutISO).getTime();
  return Math.max(0, Math.round((fin - inicio) / (60 * 1000)));
}

/** Minutos de retraso frente a la hora de regreso planeada; 0 si se devolvió a tiempo o antes. */
export function calcularRetrasoMinutos(fechaRegresoPlaneadaISO: string, fechaHoraCheckOutISO: string): number {
  const planeada = new Date(fechaRegresoPlaneadaISO).getTime();
  const real = new Date(fechaHoraCheckOutISO).getTime();
  return Math.max(0, Math.round((real - planeada) / (60 * 1000)));
}

/**
 * Diferencia (puntos porcentuales de tanque) entre el combustible
 * consumido real y el esperado para los km recorridos, según el consumo
 * promedio configurado. Positivo = se consumió más de lo esperado.
 */
export function calcularDiferenciaCombustiblePorcentaje(
  combustibleInicial: number,
  combustibleRestante: number,
  kilometrosRecorridos: number
): number {
  const consumidoReal = combustibleInicial - combustibleRestante;
  const consumidoEsperado = (kilometrosRecorridos / 100) * CHECKOUT_CONFIG.consumoEsperadoPorcentajePor100Km;
  return Math.round((consumidoReal - consumidoEsperado) * 10) / 10;
}

/** True si la fecha cae fuera del horario laboral configurado (fin de semana o fuera del rango de horas). */
export function estaFueraDeHorarioLaboral(fecha: Date): boolean {
  const diaSemana = fecha.getDay();
  const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
  if (esFinDeSemana) return true;

  const { horaInicio, horaFin, diasLaborales } = PARAMS_CONFIG.horarioLaboral;
  const esDiaLaboral = (diasLaborales as readonly number[]).includes(diaSemana);
  const hora = fecha.getHours();
  const dentroDeHorario = esDiaLaboral && hora >= horaInicio && hora < horaFin;
  return !dentroDeHorario;
}

/** True si el check-in o el check-out ocurrieron fuera del horario laboral. */
export function esUsoFueraDeHorario(fechaHoraCheckInISO: string, fechaHoraCheckOutISO: string): boolean {
  return estaFueraDeHorarioLaboral(new Date(fechaHoraCheckInISO)) || estaFueraDeHorarioLaboral(new Date(fechaHoraCheckOutISO));
}

/**
 * El uso fuera de horario ya estaba autorizado si la solicitud original
 * requirió y obtuvo aprobación especial precisamente por ese motivo (fin de
 * semana / fuera del horario laboral), según lo evaluado en Chunk 4/6.
 */
export function estabaAutorizadoFueraDeHorario(motivoAprobacionEspecial: string | undefined): boolean {
  if (!motivoAprobacionEspecial) return false;
  return motivoAprobacionEspecial.includes("fin de semana") || motivoAprobacionEspecial.includes("fuera del horario laboral");
}

export const servicioCheckOut = {
  validarDatosCheckOut,
  calcularKilometrosRecorridos,
  calcularDuracionRealMinutos,
  calcularRetrasoMinutos,
  calcularDiferenciaCombustiblePorcentaje,
  estaFueraDeHorarioLaboral,
  esUsoFueraDeHorario,
  estabaAutorizadoFueraDeHorario,
};
