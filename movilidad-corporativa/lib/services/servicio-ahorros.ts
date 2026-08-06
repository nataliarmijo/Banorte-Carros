/**
 * servicioAhorros
 * Calcula el ahorro generado por el programa de movilidad corporativa:
 * ahorro = costo estimado del escenario base − costo real optimizado,
 * desglosado por mayor uso de Pool, recomendar Uber cuando conviene, y
 * digitalización (eliminar coordinación manual). El escenario base es
 * configurable en /lib/config/params.
 */

import { COSTOS_CONFIG } from "@/lib/config/costos";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { calcularCostoVehiculo } from "./servicio-costos";
import { crearResultadoSinDatos } from "./types";
import type { Alternativa, ResultadoAhorros, ResultadoSinDatos } from "./types";

export interface ViajeParaAhorro {
  distanciaKm: number;
  duracionMinutos?: number;
  /** Alternativa realmente usada para este viaje. */
  alternativaElegida: Alternativa;
  /** Costo real (MXN) de la alternativa usada. */
  costoAlternativaElegida: number;
  /** Si el viaje fue gestionado por la app (sin coordinación manual). Por defecto true. */
  digitalizado?: boolean;
}

/** Costo hipotético de resolver el viaje con el vehículo del escenario base. */
function calcularCostoBaseAsignado(viaje: ViajeParaAhorro): number {
  const resultado = calcularCostoVehiculo({
    km: viaje.distanciaKm,
    tipoVehiculo: PARAMS_CONFIG.escenarioBaseAhorros.tipoVehiculoPorDefecto,
    modalidad: "asignado",
    duracionMinutos: viaje.duracionMinutos,
  });
  return resultado.costoTotal;
}

/**
 * Calcula el ahorro agregado de una lista de viajes ya resueltos, comparando
 * cada uno contra el escenario base configurado.
 */
export function calcularAhorros(viajes: ViajeParaAhorro[]): ResultadoAhorros | ResultadoSinDatos {
  if (viajes.length === 0) {
    return crearResultadoSinDatos("No hay viajes para calcular ahorros");
  }

  const viajesValidos = viajes.filter(
    (v) => Number.isFinite(v.distanciaKm) && v.distanciaKm > 0
  );
  if (viajesValidos.length === 0) {
    return crearResultadoSinDatos("Ninguno de los viajes tiene una distancia válida");
  }

  let costoBaseEstimado = 0;
  let costoRealOptimizado = 0;
  let mayorUsoPool = 0;
  let recomendarUberCuandoConviene = 0;
  let digitalizacion = 0;

  for (const viaje of viajesValidos) {
    const costoBaseAsignado = calcularCostoBaseAsignado(viaje);
    const digitalizadoEsteViaje = viaje.digitalizado ?? true;
    const ahorroDigitalizacionViaje =
      digitalizadoEsteViaje && PARAMS_CONFIG.escenarioBaseAhorros.incluyeCoordinacionManual
        ? COSTOS_CONFIG.uber.costoAdministrativoManual
        : 0;

    const costoBaseViaje = costoBaseAsignado + ahorroDigitalizacionViaje;

    costoBaseEstimado += costoBaseViaje;
    costoRealOptimizado += viaje.costoAlternativaElegida;
    digitalizacion += ahorroDigitalizacionViaje;

    if (viaje.alternativaElegida === "POOL") {
      mayorUsoPool += Math.max(0, costoBaseAsignado - viaje.costoAlternativaElegida);
    } else if (viaje.alternativaElegida === "UBER") {
      recomendarUberCuandoConviene += Math.max(0, costoBaseAsignado - viaje.costoAlternativaElegida);
    }
  }

  const viajesExcluidos = viajes.length - viajesValidos.length;

  return {
    ahorroTotal: costoBaseEstimado - costoRealOptimizado,
    ahorrosPorConcepto: {
      mayorUsoPool,
      recomendarUberCuandoConviene,
      digitalizacion,
    },
    costoBaseEstimado,
    costoRealOptimizado,
    escenarioBase: {
      descripcion: PARAMS_CONFIG.escenarioBaseAhorros.descripcion,
      supuestos: [
        `Modalidad por defecto: ${PARAMS_CONFIG.escenarioBaseAhorros.modalidadPorDefecto} (${PARAMS_CONFIG.escenarioBaseAhorros.tipoVehiculoPorDefecto})`,
        PARAMS_CONFIG.escenarioBaseAhorros.incluyeCoordinacionManual
          ? `Incluye coordinación manual: $${COSTOS_CONFIG.uber.costoAdministrativoManual} MXN por viaje digitalizado`
          : "No incluye coordinación manual en el escenario base",
      ],
    },
    esEstimado: true,
    notas:
      viajesExcluidos > 0
        ? [`${viajesExcluidos} viaje(s) con datos inválidos fueron excluidos del cálculo`]
        : [],
  };
}

export const servicioAhorros = {
  calcularAhorros,
};
