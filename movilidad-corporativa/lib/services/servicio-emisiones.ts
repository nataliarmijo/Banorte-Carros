/**
 * servicioEmisiones
 * Motor para estimar el impacto de CO₂ de un viaje por alternativa,
 * usando los factores de emisión configurables en /lib/config/emisiones.
 */

import {
  EMISIONES_CONFIG,
  calcularEmisionesVehiculo as calcularGramosVehiculo,
  calcularEmisionesUber as calcularGramosUber,
  calcularCO2Evitado as calcularGramosEvitados,
} from "@/lib/config/emisiones";
import type { TipoCombustible } from "@/lib/config/costos";
import type { TipoVehiculo } from "./types";
import type { ResultadoEmisiones } from "./types";

function resultadoEmisionesInvalido(notas: string[]): ResultadoEmisiones {
  return {
    totalGramosCo2: 0,
    totalKgCo2: 0,
    co2EvitadoGramos: 0,
    esEstimado: true,
    notas,
  };
}

interface ParametrosEmisionesVehiculo {
  km: number;
  tipoVehiculo: TipoVehiculo;
  rendimientoKmLitro: number;
  tipoCombustible?: TipoCombustible;
}

/**
 * Estima las emisiones de CO₂ de un viaje en vehículo Pool/Asignado y el
 * CO₂ evitado frente al escenario base (todo Uber).
 */
export function calcularEmisionesVehiculo(
  parametros: ParametrosEmisionesVehiculo
): ResultadoEmisiones {
  const { km, tipoVehiculo, rendimientoKmLitro, tipoCombustible = "GASOLINA" } = parametros;

  if (!Number.isFinite(km) || km <= 0) {
    return resultadoEmisionesInvalido(["Sin datos suficientes: distancia inválida"]);
  }

  if (!Number.isFinite(rendimientoKmLitro) || rendimientoKmLitro <= 0) {
    return resultadoEmisionesInvalido(["Sin datos suficientes: rendimiento inválido"]);
  }

  const totalGramosCo2 = calcularGramosVehiculo(
    km,
    rendimientoKmLitro,
    tipoCombustible,
    tipoVehiculo
  );
  const co2EvitadoGramos = calcularGramosEvitados(km, totalGramosCo2);

  return {
    totalGramosCo2,
    totalKgCo2: totalGramosCo2 / 1000,
    co2EvitadoGramos,
    esEstimado: true,
    notas: [`Estimado para ${km} km, ${tipoVehiculo}, combustible ${tipoCombustible}`],
  };
}

interface ParametrosEmisionesUber {
  km: number;
}

/**
 * Estima las emisiones de CO₂ de un viaje en Uber (flota promedio).
 */
export function calcularEmisionesUber(parametros: ParametrosEmisionesUber): ResultadoEmisiones {
  const { km } = parametros;

  if (!Number.isFinite(km) || km <= 0) {
    return resultadoEmisionesInvalido(["Sin datos suficientes: distancia inválida"]);
  }

  const totalGramosCo2 = calcularGramosUber(km);
  const co2EvitadoGramos = calcularGramosEvitados(km, totalGramosCo2);

  return {
    totalGramosCo2,
    totalKgCo2: totalGramosCo2 / 1000,
    co2EvitadoGramos,
    esEstimado: true,
    notas: [`Estimado para ${km} km, flota promedio Uber (${EMISIONES_CONFIG.uber.gCO2PorKm} g CO₂/km)`],
  };
}

export const servicioEmisiones = {
  calcularEmisionesVehiculo,
  calcularEmisionesUber,
};
