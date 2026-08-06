/**
 * Configuración de costos para vehículos y Uber
 * Valores editables y sin hardcodeados en la lógica
 */

export type TipoCombustible = "GASOLINA" | "DIESEL" | "ELECTRICO" | "HIBRIDO";

export interface ConfigVehiculo {
  rendimientoKmLitro: number; // km/litro
  precioCombustibleLitro: number; // MXN/litro
  costoMantenimientoKm: number; // MXN/km (cambios, filtros, etc.)
  costoSeguroMensual: number; // MXN/mes
  costoDepreciacionMensual: number; // MXN/mes
  costoDesgasteMensual: number; // llantas, frenos, etc.
  costoAdministrativoMensual: number; // registro, tenencia, etc.
  costoEntregaRecepcionHora: number; // MXN/hora para devolver al depot
  capacidadPersonas: number;
}

export interface ConfigUber {
  tarifaBase: number; // MXN
  costoKm: number; // MXN/km
  costoMinuto: number; // MXN/minuto
  costoAdministrativoManual: number; // MXN costo de coordinación manual
  supuestoCasetas: number; // MXN (promedio por viaje)
}

export const COSTOS_CONFIG = {
  // Configuración por tipo de vehículo (Pool y Asignado)
  vehiculos: {
    // Sedán compacto (Pool)
    "sedan-compacto": {
      rendimientoKmLitro: 14,
      precioCombustibleLitro: 20.5, // Gasolina Premium
      costoMantenimientoKm: 2.5,
      costoSeguroMensual: 1200,
      costoDepreciacionMensual: 3000,
      costoDesgasteMensual: 500,
      costoAdministrativoMensual: 300,
      costoEntregaRecepcionHora: 150,
      capacidadPersonas: 4,
    } as ConfigVehiculo,

    // Sedán ejecutivo (Asignado)
    "sedan-ejecutivo": {
      rendimientoKmLitro: 12,
      precioCombustibleLitro: 21.0,
      costoMantenimientoKm: 3.5,
      costoSeguroMensual: 2500,
      costoDepreciacionMensual: 6000,
      costoDesgasteMensual: 700,
      costoAdministrativoMensual: 400,
      costoEntregaRecepcionHora: 200,
      capacidadPersonas: 4,
    } as ConfigVehiculo,

    // SUV (Asignado, para viajes grupales o ejecutivos)
    "suv-asignado": {
      rendimientoKmLitro: 10,
      precioCombustibleLitro: 20.5,
      costoMantenimientoKm: 4.0,
      costoSeguroMensual: 3000,
      costoDepreciacionMensual: 8000,
      costoDesgasteMensual: 900,
      costoAdministrativoMensual: 500,
      costoEntregaRecepcionHora: 250,
      capacidadPersonas: 7,
    } as ConfigVehiculo,
  } as Record<string, ConfigVehiculo>,

  // Configuración Uber
  uber: {
    tarifaBase: 15,
    costoKm: 8.5,
    costoMinuto: 1.2,
    costoAdministrativoManual: 50, // coordinación manual del viaje
    supuestoCasetas: 25, // promedio de casetas Uber
  } as ConfigUber,

  // Km promedio acumulados al mes por vehículo según modalidad, usados para
  // amortizar los costos fijos mensuales (seguro, depreciación, desgaste,
  // administrativo) a un costo por km
  kmPromedioMensuales: {
    pool: 5000,
    asignado: 4000,
  },
} as const;

export type ModalidadFlota = "pool" | "asignado";

export interface CostosFijosPorKm {
  seguro: number;
  depreciacion: number;
  desgaste: number;
  administrativo: number;
}

/**
 * Amortiza cada rubro fijo mensual del vehículo (seguro, depreciación,
 * desgaste, administrativo) a un costo por km, usando el kilometraje
 * promedio mensual configurado para la modalidad.
 *
 * Retorna null si no hay km promedio configurado (evita división entre 0).
 */
export function calcularCostosFijosPorKm(
  config: ConfigVehiculo,
  modalidad: ModalidadFlota
): CostosFijosPorKm | null {
  const kmMensuales = COSTOS_CONFIG.kmPromedioMensuales[modalidad];
  if (!kmMensuales || kmMensuales <= 0) {
    return null;
  }

  return {
    seguro: config.costoSeguroMensual / kmMensuales,
    depreciacion: config.costoDepreciacionMensual / kmMensuales,
    desgaste: config.costoDesgasteMensual / kmMensuales,
    administrativo: config.costoAdministrativoMensual / kmMensuales,
  };
}
