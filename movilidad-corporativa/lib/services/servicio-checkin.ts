/**
 * servicioCheckIn
 * Reglas puras del check-in digital: ventana de vigencia de la fecha de
 * salida y validación de los datos capturados en campo (kilometraje inicial
 * razonable respecto al último registrado del vehículo, combustible inicial,
 * fotografías, responsiva y firma electrónica simulada).
 */

import { CHECKIN_CONFIG } from "@/lib/config/checkin";

/**
 * El check-in se habilita desde CHECKIN_CONFIG.ventanaPreviaHoras antes de la
 * fecha/hora de salida programada; no hay límite superior (llegar tarde no
 * bloquea el check-in).
 */
export function esFechaSalidaVigente(fechaSalidaISO: string, ahora: Date = new Date()): boolean {
  const fechaSalida = new Date(fechaSalidaISO);
  if (Number.isNaN(fechaSalida.getTime())) return false;
  const ventanaMs = CHECKIN_CONFIG.ventanaPreviaHoras * 60 * 60 * 1000;
  return ahora.getTime() >= fechaSalida.getTime() - ventanaMs;
}

export interface DatosCheckIn {
  kilometrajeInicial: number;
  kilometrajeActualVehiculo: number;
  combustibleInicial: number;
  fotos: string[];
  firmaElectronica: string;
  responsivaAceptada: boolean;
}

export interface ResultadoValidacionCheckIn {
  valido: boolean;
  errores: string[];
}

/** Valida los datos capturados en el check-in; agrega un mensaje claro por cada dato obligatorio faltante o inválido. */
export function validarDatosCheckIn(datos: DatosCheckIn): ResultadoValidacionCheckIn {
  const errores: string[] = [];
  const { minimoPorcentaje, maximoPorcentaje } = CHECKIN_CONFIG.combustible;

  if (!Number.isFinite(datos.kilometrajeInicial) || datos.kilometrajeInicial <= 0) {
    errores.push("Ingresa un kilometraje inicial válido.");
  } else if (datos.kilometrajeInicial < datos.kilometrajeActualVehiculo) {
    errores.push(
      `El kilometraje inicial (${datos.kilometrajeInicial} km) no puede ser menor al último registrado del vehículo (${datos.kilometrajeActualVehiculo} km).`
    );
  } else if (datos.kilometrajeInicial > datos.kilometrajeActualVehiculo + CHECKIN_CONFIG.kilometrajeExcedenteRazonableKm) {
    errores.push(
      `El kilometraje inicial (${datos.kilometrajeInicial} km) parece demasiado alto respecto al último registrado (${datos.kilometrajeActualVehiculo} km); verifica el valor.`
    );
  }

  if (
    !Number.isFinite(datos.combustibleInicial) ||
    datos.combustibleInicial < minimoPorcentaje ||
    datos.combustibleInicial > maximoPorcentaje
  ) {
    errores.push(`Indica el nivel de combustible inicial (${minimoPorcentaje}-${maximoPorcentaje}%).`);
  }

  if (datos.fotos.length < CHECKIN_CONFIG.fotosMinimas) {
    errores.push(
      CHECKIN_CONFIG.fotosMinimas === 1
        ? "Carga al menos una fotografía del vehículo."
        : `Carga al menos ${CHECKIN_CONFIG.fotosMinimas} fotografías del vehículo.`
    );
  }

  if (!datos.responsivaAceptada) {
    errores.push("Debes aceptar la responsiva para continuar.");
  }

  if (!datos.firmaElectronica || datos.firmaElectronica.trim().length === 0) {
    errores.push("Captura tu firma electrónica antes de confirmar.");
  }

  return { valido: errores.length === 0, errores };
}

export const servicioCheckIn = {
  esFechaSalidaVigente,
  validarDatosCheckIn,
};
