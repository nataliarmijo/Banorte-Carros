/**
 * Configuración de factores de emisión de CO₂
 * Basado en datos del IPCC y calculadoras de emisiones locales
 */

import type { TipoCombustible } from "./costos";

export interface FactorEmision {
  /**
   * Gramos de CO₂ emitidos por litro de combustible quemado
   * Gasolina: ~2.31 kg CO₂/litro
   * Diesel: ~2.68 kg CO₂/litro
   * No aplica para eléctricos puros (usan gCO2PorKm).
   */
  gCO2PorLitro?: number;

  /**
   * Para vehículos eléctricos (e híbridos en modo eléctrico), g CO₂ por km
   * basado en energía de la red eléctrica (México ~0.4 kg CO₂/kWh)
   */
  gCO2PorKm?: number;

  /**
   * Para híbridos, porcentaje de tiempo usando motor eléctrico
   */
  porcentajeElectrico?: number;

  descripcion: string;
}

export const EMISIONES_CONFIG = {
  // Factores por tipo de combustible
  combustibles: {
    GASOLINA: {
      gCO2PorLitro: 2310, // 2.31 kg = 2310 g
      descripcion: "Gasolina Premium",
    },
    DIESEL: {
      gCO2PorLitro: 2680, // 2.68 kg = 2680 g
      descripcion: "Diesel",
    },
    ELECTRICO: {
      gCO2PorKm: 80, // ~0.08 kg CO₂/km (basado en grid mexicano)
      descripcion: "Eléctrico (grid MX)",
    },
    HIBRIDO: {
      gCO2PorLitro: 2310,
      gCO2PorKm: 40, // hybrid mode
      porcentajeElectrico: 0.4, // 40% del tiempo eléctrico
      descripcion: "Híbrido",
    },
  } as Record<TipoCombustible, FactorEmision>,

  // Factores por tipo de vehículo (variación respecto a combustible base)
  // (multiplicadores para considerar peso, aerodinámica, etc.)
  multiplicadoresPorTipo: {
    "sedan-compacto": 1.0, // baseline
    "sedan-ejecutivo": 1.05, // ligeramente más peso/consumo
    "suv-asignado": 1.15, // mayor consumo por peso/aerodinámica
  },

  // Emisiones de Uber
  // Promedio flota Uber (mayoría sedanes, algunos híbridos)
  uber: {
    gCO2PorKm: 160, // ~0.16 kg CO₂/km (promedio)
    descripcion: "Promedio flota Uber (mayoría gasolina)",
  },

  // Escenario base: si todxs usaran Uber todos los días
  // (para calcular "CO₂ evitado")
  escenarioBase: {
    gCO2PorKm: 160, // mismo que Uber
    descripcion: "Baseline: todo Uber sin programa de movilidad",
  },
} as const;

/**
 * Calcula emisiones totales de un viaje en un vehículo
 * @param km Distancia del viaje
 * @param rendimiento km/litro del vehículo
 * @param tipoCombustible Tipo de combustible
 * @param tipoVehiculo Tipo de vehículo para aplicar multiplicador
 * @returns Gramos de CO₂ emitidos
 */
export function calcularEmisionesVehiculo(
  km: number,
  rendimiento: number,
  tipoCombustible: TipoCombustible = "GASOLINA",
  tipoVehiculo: "sedan-compacto" | "sedan-ejecutivo" | "suv-asignado" = "sedan-compacto"
): number {
  if (km <= 0 || rendimiento <= 0) return 0;

  const factor = EMISIONES_CONFIG.combustibles[tipoCombustible];
  const multiplicador =
    EMISIONES_CONFIG.multiplicadoresPorTipo[tipoVehiculo] || 1.0;

  if (tipoCombustible === "ELECTRICO" && factor.gCO2PorKm) {
    return km * factor.gCO2PorKm * multiplicador;
  }

  // Para combustibles tradicionales
  const litrosConsumidos = km / rendimiento;
  return litrosConsumidos * (factor.gCO2PorLitro ?? 0) * multiplicador;
}

/**
 * Calcula emisiones para un viaje en Uber
 */
export function calcularEmisionesUber(km: number): number {
  if (km <= 0) return 0;
  return km * EMISIONES_CONFIG.uber.gCO2PorKm;
}

/**
 * Calcula CO₂ evitado (escenario base - real)
 */
export function calcularCO2Evitado(
  kmViaje: number,
  emisionesReales: number
): number {
  const emisionesBaseline =
    kmViaje * EMISIONES_CONFIG.escenarioBase.gCO2PorKm;
  return Math.max(0, emisionesBaseline - emisionesReales);
}
