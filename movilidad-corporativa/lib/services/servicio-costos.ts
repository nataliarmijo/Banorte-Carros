/**
 * servicioCostos
 * Motor central para estimar el costo de un viaje por alternativa
 * (Pool/Asignado o Uber). Todos los parámetros numéricos vienen de
 * /lib/config — este archivo no contiene valores mágicos.
 */

import {
  COSTOS_CONFIG,
  calcularCostosFijosPorKm,
  type ModalidadFlota,
} from "@/lib/config/costos";
import { PARAMS_CONFIG } from "@/lib/config/params";
import type { TipoVehiculo } from "./types";
import type { ResultadoCosto, ResultadoSinDatos } from "./types";
import { crearResultadoSinDatos } from "./types";

function resultadoCostoInvalido(notas: string[]): ResultadoCosto {
  return {
    costoTotal: 0,
    moneda: "MXN",
    desglose: {},
    esEstimado: true,
    notas,
  };
}

/** Estima el costo de casetas para un viaje, a partir de la distancia. */
export function estimarCasetas(km: number): number {
  return Math.max(PARAMS_CONFIG.casetas.minimo, km * PARAMS_CONFIG.casetas.porcentajePorKm);
}

/** Estima el costo de estacionamiento para un viaje, a partir de su duración. */
export function estimarEstacionamiento(duracionMinutos: number): number {
  return (duracionMinutos / 60) * PARAMS_CONFIG.estacionamiento.costoPorMinuto;
}

interface ParametrosCostoVehiculo {
  km: number;
  tipoVehiculo: TipoVehiculo;
  modalidad: ModalidadFlota;
  duracionMinutos?: number;
}

/**
 * Calcula el costo estimado de un viaje en vehículo Pool o Asignado:
 * combustible + mantenimiento + seguro + depreciación + desgaste +
 * costo administrativo (amortizados por km) + entrega/recepción +
 * estacionamiento + casetas estimadas.
 */
export function calcularCostoVehiculo(
  parametros: ParametrosCostoVehiculo
): ResultadoCosto {
  const { km, tipoVehiculo, modalidad, duracionMinutos } = parametros;

  if (!Number.isFinite(km) || km < 0) {
    return resultadoCostoInvalido(["Sin datos suficientes: distancia inválida"]);
  }

  const config = COSTOS_CONFIG.vehiculos[tipoVehiculo];
  if (!config) {
    return resultadoCostoInvalido([
      `Sin datos suficientes: no hay configuración de costos para "${tipoVehiculo}"`,
    ]);
  }

  if (config.rendimientoKmLitro <= 0) {
    return resultadoCostoInvalido([
      `Sin datos suficientes: rendimiento inválido para "${tipoVehiculo}"`,
    ]);
  }

  const fijosPorKm = calcularCostosFijosPorKm(config, modalidad);
  if (!fijosPorKm) {
    return resultadoCostoInvalido([
      `Sin datos suficientes: no hay km promedio mensual configurado para "${modalidad}"`,
    ]);
  }

  const minutos = duracionMinutos ?? PARAMS_CONFIG.duracionEstimadaMinutosPorDefecto;

  const combustible = (km / config.rendimientoKmLitro) * config.precioCombustibleLitro;
  const mantenimiento = km * config.costoMantenimientoKm;
  const seguro = fijosPorKm.seguro * km;
  const depreciacion = fijosPorKm.depreciacion * km;
  const desgaste = fijosPorKm.desgaste * km;
  const administrativo = fijosPorKm.administrativo * km;
  const entregaRecepcion =
    (PARAMS_CONFIG.entregaRecepcion.minutosEstimados / 60) * config.costoEntregaRecepcionHora;
  const estacionamiento = estimarEstacionamiento(minutos);
  const casetas = estimarCasetas(km);

  const costoTotal =
    combustible +
    mantenimiento +
    seguro +
    depreciacion +
    desgaste +
    administrativo +
    entregaRecepcion +
    estacionamiento +
    casetas;

  return {
    costoTotal,
    moneda: "MXN",
    desglose: {
      combustible,
      mantenimiento,
      seguro,
      depreciacion,
      desgaste,
      administrativo,
      entregaRecepcion,
      estacionamiento,
      casetas,
    },
    esEstimado: true,
    notas: [`Estimado para ${km} km en ${tipoVehiculo} (${modalidad})`],
  };
}

interface ParametrosCostoUber {
  km: number;
  duracionMinutos?: number;
  factorDemanda?: number; // 1.0 = normal, ver PARAMS_CONFIG.factorDemandaUber
}

/**
 * Calcula el costo estimado de un viaje en Uber: tarifa base + costo por km
 * + costo por minuto (afectados por el factor de demanda) + casetas
 * estimadas.
 *
 * No incluye el costo administrativo de gestión manual
 * (`COSTOS_CONFIG.uber.costoAdministrativoManual`): ese parámetro representa
 * el costo de coordinar un viaje a mano y se usa en `servicioAhorros` para
 * cuantificar el ahorro de digitalización, no el costo real del viaje en sí.
 */
export function calcularCostoUber(parametros: ParametrosCostoUber): ResultadoCosto {
  const { km } = parametros;

  if (!Number.isFinite(km) || km < 0) {
    return resultadoCostoInvalido(["Sin datos suficientes: distancia inválida"]);
  }

  const minutos = parametros.duracionMinutos ?? PARAMS_CONFIG.duracionEstimadaMinutosPorDefecto;
  const factorDemanda = parametros.factorDemanda ?? PARAMS_CONFIG.factorDemandaUber.horarioNormal;

  const config = COSTOS_CONFIG.uber;

  const tarifaBase = config.tarifaBase * factorDemanda;
  const costoPorKm = config.costoKm * km * factorDemanda;
  const costoPorMinuto = config.costoMinuto * minutos * factorDemanda;
  const casetas = config.supuestoCasetas;

  const costoTotal = tarifaBase + costoPorKm + costoPorMinuto + casetas;

  return {
    costoTotal,
    moneda: "MXN",
    desglose: {
      tarifaBase,
      costoPorKm,
      costoPorMinuto,
      casetas,
    },
    esEstimado: true,
    notas: [`Factor de demanda aplicado: ${factorDemanda}x`, "Incluye casetas estimadas"],
  };
}

/**
 * Determina el factor de demanda de Uber aplicable según fecha y hora,
 * usando los umbrales configurados (horario pico / fin de semana / normal).
 */
export function estimarFactorDemandaUber(fecha: Date, horaEstimada: number): number {
  const esFinDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
  if (esFinDeSemana) {
    return PARAMS_CONFIG.factorDemandaUber.finDeSemana;
  }

  const esHorarioPico = PARAMS_CONFIG.factorDemandaUber.rangosPico.some(
    (rango) => horaEstimada >= rango.horaInicio && horaEstimada < rango.horaFin
  );

  return esHorarioPico
    ? PARAMS_CONFIG.factorDemandaUber.horarioPico
    : PARAMS_CONFIG.factorDemandaUber.horarioNormal;
}

/**
 * Compara dos costos y retorna cuál es más barato y por qué margen.
 * Retorna "Sin datos suficientes" si ambos costos son cero (nada que comparar).
 */
export function compararCostos(
  a: { etiqueta: string; costo: ResultadoCosto },
  b: { etiqueta: string; costo: ResultadoCosto }
): { masBarato: string; diferencia: number; porcentajeMasBarato: number } | ResultadoSinDatos {
  const base = Math.max(a.costo.costoTotal, b.costo.costoTotal);
  if (base <= 0) {
    return crearResultadoSinDatos("Ambos costos son cero o inválidos, no hay base para comparar");
  }

  const diferencia = Math.abs(a.costo.costoTotal - b.costo.costoTotal);
  const porcentajeMasBarato = diferencia / base;

  return {
    masBarato: a.costo.costoTotal <= b.costo.costoTotal ? a.etiqueta : b.etiqueta,
    diferencia,
    porcentajeMasBarato,
  };
}

export const servicioCostos = {
  calcularCostoVehiculo,
  calcularCostoUber,
  estimarFactorDemandaUber,
  compararCostos,
  estimarCasetas,
  estimarEstacionamiento,
};
