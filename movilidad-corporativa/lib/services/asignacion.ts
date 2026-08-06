import { businessRules } from "@/lib/config/business-rules";
import type { ModalidadVehiculo } from "@/lib/models";

export interface AlternativaComparada {
  modalidad: ModalidadVehiculo;
  costoEstimado: number;
  compatible: boolean;
  disponible: boolean;
  requiereAprobacionEspecial: boolean;
  motivo: string;
}

export function compararAlternativas(params: {
  hora: string;
  esFinDeSemana: boolean;
  distanciaKm: number;
  costoPool: number;
  costoAsignado: number;
  costoUber: number;
  poolDisponible: boolean;
  asignadoDisponible: boolean;
  poolCompatible: boolean;
  asignadoCompatible: boolean;
}): AlternativaComparada[] {
  const requiereAprobacionEspecial =
    (businessRules.requireSpecialApprovalOutsideHours && params.hora > "18:00") ||
    (businessRules.requireSpecialApprovalWeekend && params.esFinDeSemana) ||
    params.distanciaKm > businessRules.maxPoolTripDistanceKm;

  const alternativas: AlternativaComparada[] = [
    {
      modalidad: "POOL",
      costoEstimado: params.costoPool,
      compatible: params.poolCompatible,
      disponible: params.poolDisponible,
      requiereAprobacionEspecial,
      motivo: params.poolCompatible && params.poolDisponible ? "Disponible y compatible" : "No disponible o incompatible",
    },
    {
      modalidad: "ASIGNADO",
      costoEstimado: params.costoAsignado,
      compatible: params.asignadoCompatible,
      disponible: params.asignadoDisponible,
      requiereAprobacionEspecial,
      motivo: params.asignadoCompatible && params.asignadoDisponible ? "Disponible y compatible" : "No disponible o incompatible",
    },
    {
      modalidad: "UBER",
      costoEstimado: params.costoUber,
      compatible: true,
      disponible: true,
      requiereAprobacionEspecial,
      motivo: "Alternativa externa de respaldo",
    },
  ];

  return alternativas;
}

export function elegirAlternativaMejor(
  alternativas: AlternativaComparada[],
): AlternativaComparada {
  const pool = alternativas.find((item) => item.modalidad === "POOL");
  const asignado = alternativas.find((item) => item.modalidad === "ASIGNADO");
  const uber = alternativas.find((item) => item.modalidad === "UBER");

  if (!pool || !asignado || !uber) {
    throw new Error("Faltan alternativas para comparar");
  }

  const poolEsMejor =
    pool.compatible &&
    pool.disponible &&
    pool.costoEstimado <= asignado.costoEstimado * businessRules.poolThresholdRatio;

  const asignadoEsMejor =
    asignado.compatible &&
    asignado.disponible &&
    asignado.costoEstimado <= pool.costoEstimado * businessRules.poolThresholdRatio;

  const uberEsMejor =
    uber.costoEstimado <= Math.min(pool.costoEstimado, asignado.costoEstimado) * businessRules.uberThresholdRatio;

  if (uberEsMejor) {
    return uber;
  }

  if (poolEsMejor) {
    return pool;
  }

  if (asignadoEsMejor) {
    return asignado;
  }

  return uber;
}
