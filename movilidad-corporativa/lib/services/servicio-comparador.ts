/**
 * servicioComparador
 * Dado un borrador de solicitud de viaje y la flota Pool/Asignado
 * disponible, calcula costo y emisiones para las 3 alternativas (Pool,
 * Asignado, Uber) y aplica las reglas de recomendación y de aprobación
 * especial configuradas en /lib/config.
 */

import { COSTOS_CONFIG } from "@/lib/config/costos";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { calcularCostoUber, calcularCostoVehiculo, estimarFactorDemandaUber } from "./servicio-costos";
import { calcularEmisionesUber, calcularEmisionesVehiculo } from "./servicio-emisiones";
import { crearResultadoSinDatos } from "./types";
import type {
  Alternativa,
  AlternativaComparada,
  BorradorSolicitud,
  ResultadoComparacion,
  ResultadoCosto,
  ResultadoEmisiones,
  ResultadoSinDatos,
  VehiculoDisponible,
} from "./types";

function costoNoDisponible(motivo: string): ResultadoCosto {
  return { costoTotal: 0, moneda: "MXN", desglose: {}, esEstimado: true, notas: [motivo] };
}

function emisionesNoDisponibles(motivo: string): ResultadoEmisiones {
  return { totalGramosCo2: 0, totalKgCo2: 0, co2EvitadoGramos: 0, esEstimado: true, notas: [motivo] };
}

function filtrarCandidatos(
  vehiculos: VehiculoDisponible[],
  tipo: "POOL" | "ASIGNADO",
  solicitud: BorradorSolicitud
): VehiculoDisponible[] {
  return vehiculos.filter(
    (v) =>
      v.tipo === tipo &&
      v.territorio === solicitud.territorioOrigen &&
      v.capacidad >= solicitud.pasajeros &&
      (!solicitud.tipoVehiculoRequerido || v.tipoVehiculo === solicitud.tipoVehiculoRequerido)
  );
}

interface CandidatoElegido {
  vehiculo: VehiculoDisponible;
  costo: ResultadoCosto;
  emisiones: ResultadoEmisiones;
}

/** Entre los candidatos disponibles, elige el de menor costo estimado. */
function elegirMejorCandidato(
  candidatos: VehiculoDisponible[],
  solicitud: BorradorSolicitud
): CandidatoElegido | null {
  const disponibles = candidatos.filter((v) => v.disponible);
  if (disponibles.length === 0) return null;

  let mejor: { vehiculo: VehiculoDisponible; costo: ResultadoCosto } | null = null;
  for (const vehiculo of disponibles) {
    const modalidad = vehiculo.tipo === "POOL" ? "pool" : "asignado";
    const costo = calcularCostoVehiculo({
      km: solicitud.distanciaEstimadaKm,
      tipoVehiculo: vehiculo.tipoVehiculo,
      modalidad,
      duracionMinutos: solicitud.duracionEstimadaMinutos,
    });
    if (!mejor || costo.costoTotal < mejor.costo.costoTotal) {
      mejor = { vehiculo, costo };
    }
  }
  if (!mejor) return null;

  const configVehiculo = COSTOS_CONFIG.vehiculos[mejor.vehiculo.tipoVehiculo];
  const emisiones = calcularEmisionesVehiculo({
    km: solicitud.distanciaEstimadaKm,
    tipoVehiculo: mejor.vehiculo.tipoVehiculo,
    rendimientoKmLitro: configVehiculo?.rendimientoKmLitro ?? 0,
    tipoCombustible: mejor.vehiculo.tipoCombustible,
  });

  return { vehiculo: mejor.vehiculo, costo: mejor.costo, emisiones };
}

function puntuacionPorCosto(costo: number, costoMin: number, costoMax: number): number {
  if (costoMax === costoMin) return 100;
  return Math.round(100 - ((costo - costoMin) / (costoMax - costoMin)) * 100);
}

function elegirRecomendacion(params: {
  poolDisponible: boolean;
  asignadoDisponible: boolean;
  costoPool?: number;
  costoAsignado?: number;
  costoUber: number;
}): { recomendada: Alternativa; explicacion: string } {
  const { poolDisponible, asignadoDisponible, costoPool, costoAsignado, costoUber } = params;

  if (!poolDisponible && !asignadoDisponible) {
    return {
      recomendada: "UBER",
      explicacion:
        "Se recomienda Uber porque no hay unidades Pool ni Asignado disponibles en tu territorio para ese horario.",
    };
  }

  const costosVehiculares = [costoPool, costoAsignado].filter(
    (c): c is number => typeof c === "number"
  );
  const mejorCostoVehicular = Math.min(...costosVehiculares);
  const mejorEsPool = costoPool !== undefined && costoPool === mejorCostoVehicular;

  const ahorroUber = (mejorCostoVehicular - costoUber) / mejorCostoVehicular;
  if (ahorroUber >= PARAMS_CONFIG.margenUberRecomendacion) {
    return {
      recomendada: "UBER",
      explicacion: `Se recomienda Uber porque su costo estimado es ${Math.round(ahorroUber * 100)}% menor que ${mejorEsPool ? "un vehículo Pool" : "un vehículo Asignado"} ($${mejorCostoVehicular.toFixed(0)} MXN).`,
    };
  }

  const poolEsSimilarOMenor =
    costoPool !== undefined &&
    (costoAsignado === undefined ||
      costoPool <= costoAsignado * (1 + PARAMS_CONFIG.porcentajeTolerancia));

  if (poolDisponible && poolEsSimilarOMenor) {
    return {
      recomendada: "POOL",
      explicacion:
        "Se recomienda un vehículo Pool porque hay una unidad disponible y compatible con costo similar o menor al de un vehículo Asignado.",
    };
  }

  if (asignadoDisponible) {
    return {
      recomendada: "ASIGNADO",
      explicacion:
        "Se recomienda un vehículo Asignado porque es la alternativa disponible de menor costo para este viaje.",
    };
  }

  return {
    recomendada: "UBER",
    explicacion: "Se recomienda Uber porque no hay una alternativa vehicular disponible más conveniente.",
  };
}

function evaluarAprobacionEspecial(
  solicitud: BorradorSolicitud,
  costoElegido: number,
  limiteCostoAprobacion: number
): { requiereAprobacionEspecial: boolean; motivoAprobacionEspecial?: string } {
  const motivos: string[] = [];

  const diaSemana = solicitud.fecha.getDay();
  const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
  if (esFinDeSemana) {
    motivos.push("se realiza en fin de semana");
  }

  const { horaInicio, horaFin, diasLaborales } = PARAMS_CONFIG.horarioLaboral;
  const dentroDeHorarioLaboral =
    !esFinDeSemana &&
    (diasLaborales as readonly number[]).includes(diaSemana) &&
    solicitud.horaEstimada >= horaInicio &&
    solicitud.horaEstimada < horaFin;
  if (!esFinDeSemana && !dentroDeHorarioLaboral) {
    motivos.push("se realiza fuera del horario laboral");
  }

  if (costoElegido > limiteCostoAprobacion) {
    motivos.push(`su costo estimado ($${costoElegido.toFixed(0)} MXN) supera el límite de $${limiteCostoAprobacion} MXN`);
  }

  return {
    requiereAprobacionEspecial: motivos.length > 0,
    motivoAprobacionEspecial: motivos.length > 0 ? motivos.join(", ") : undefined,
  };
}

export interface OpcionesComparador {
  /** Límite de costo (MXN) a partir del cual se marca aprobación especial. */
  limiteCostoAprobacion?: number;
}

/**
 * Compara Pool, Asignado y Uber para un borrador de solicitud y devuelve
 * la alternativa recomendada con una explicación en lenguaje simple.
 */
export function compararAlternativas(
  solicitud: BorradorSolicitud,
  vehiculosDisponibles: VehiculoDisponible[],
  opciones: OpcionesComparador = {}
): ResultadoComparacion | ResultadoSinDatos {
  if (!Number.isFinite(solicitud.distanciaEstimadaKm) || solicitud.distanciaEstimadaKm <= 0) {
    return crearResultadoSinDatos("La distancia estimada del viaje no es válida");
  }
  if (
    !Number.isFinite(solicitud.horaEstimada) ||
    solicitud.horaEstimada < 0 ||
    solicitud.horaEstimada > 23
  ) {
    return crearResultadoSinDatos("La hora estimada del viaje no es válida");
  }
  if (!Number.isFinite(solicitud.pasajeros) || solicitud.pasajeros <= 0) {
    return crearResultadoSinDatos("El número de pasajeros no es válido");
  }

  const limiteCostoAprobacion =
    opciones.limiteCostoAprobacion ?? PARAMS_CONFIG.limitesCostoEspecial.colaborador;

  const poolCandidatos = filtrarCandidatos(vehiculosDisponibles, "POOL", solicitud);
  const asignadoCandidatos = filtrarCandidatos(vehiculosDisponibles, "ASIGNADO", solicitud);

  const mejorPool = elegirMejorCandidato(poolCandidatos, solicitud);
  const mejorAsignado = elegirMejorCandidato(asignadoCandidatos, solicitud);

  const factorDemanda = estimarFactorDemandaUber(solicitud.fecha, solicitud.horaEstimada);
  const costoUber = calcularCostoUber({
    km: solicitud.distanciaEstimadaKm,
    duracionMinutos: solicitud.duracionEstimadaMinutos,
    factorDemanda,
  });
  const emisionesUber = calcularEmisionesUber({ km: solicitud.distanciaEstimadaKm });

  const costosDisponibles = [mejorPool?.costo.costoTotal, mejorAsignado?.costo.costoTotal, costoUber.costoTotal].filter(
    (c): c is number => typeof c === "number"
  );
  const costoMin = Math.min(...costosDisponibles);
  const costoMax = Math.max(...costosDisponibles);

  const alternativas: AlternativaComparada[] = [
    {
      tipo: "POOL",
      vehiculoId: mejorPool?.vehiculo.id,
      vehiculoNombre: mejorPool?.vehiculo.nombre,
      disponible: mejorPool !== null,
      compatible: poolCandidatos.length > 0,
      costo: mejorPool?.costo ?? costoNoDisponible("No hay vehículo Pool compatible y disponible en el territorio para ese horario"),
      emisiones: mejorPool?.emisiones ?? emisionesNoDisponibles("No hay vehículo Pool disponible para estimar emisiones"),
      puntuacion: mejorPool ? puntuacionPorCosto(mejorPool.costo.costoTotal, costoMin, costoMax) : 0,
    },
    {
      tipo: "ASIGNADO",
      vehiculoId: mejorAsignado?.vehiculo.id,
      vehiculoNombre: mejorAsignado?.vehiculo.nombre,
      disponible: mejorAsignado !== null,
      compatible: asignadoCandidatos.length > 0,
      costo: mejorAsignado?.costo ?? costoNoDisponible("No hay vehículo Asignado compatible y disponible en el territorio para ese horario"),
      emisiones: mejorAsignado?.emisiones ?? emisionesNoDisponibles("No hay vehículo Asignado disponible para estimar emisiones"),
      puntuacion: mejorAsignado ? puntuacionPorCosto(mejorAsignado.costo.costoTotal, costoMin, costoMax) : 0,
    },
    {
      tipo: "UBER",
      disponible: true,
      compatible: true,
      costo: costoUber,
      emisiones: emisionesUber,
      puntuacion: puntuacionPorCosto(costoUber.costoTotal, costoMin, costoMax),
    },
  ];

  const { recomendada, explicacion } = elegirRecomendacion({
    poolDisponible: mejorPool !== null,
    asignadoDisponible: mejorAsignado !== null,
    costoPool: mejorPool?.costo.costoTotal,
    costoAsignado: mejorAsignado?.costo.costoTotal,
    costoUber: costoUber.costoTotal,
  });

  const alternativaElegida = alternativas.find((a) => a.tipo === recomendada)!;
  const { requiereAprobacionEspecial, motivoAprobacionEspecial } = evaluarAprobacionEspecial(
    solicitud,
    alternativaElegida.costo.costoTotal,
    limiteCostoAprobacion
  );

  return {
    alternativas,
    recomendada,
    requiereAprobacionEspecial,
    motivoAprobacionEspecial,
    explicacion: requiereAprobacionEspecial
      ? `${explicacion} Este viaje requiere aprobación especial porque ${motivoAprobacionEspecial}.`
      : explicacion,
    esEstimado: true,
    notas: [
      `Pool: ${poolCandidatos.length} unidad(es) compatible(s) en el territorio, ${poolCandidatos.filter((v) => v.disponible).length} disponible(s)`,
      `Asignado: ${asignadoCandidatos.length} unidad(es) compatible(s) en el territorio, ${asignadoCandidatos.filter((v) => v.disponible).length} disponible(s)`,
      `Factor de demanda Uber aplicado: ${factorDemanda}x`,
    ],
  };
}

export const servicioComparador = {
  compararAlternativas,
};
