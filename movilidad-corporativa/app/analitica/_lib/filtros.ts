import type { ModalidadVehiculo } from "@/lib/models";
import type { TipoVehiculo } from "@/lib/services/types";
import type { TipoCombustible } from "@/lib/config/costos";
import type { FiltrosAnaliticaUI } from "@/lib/adapters/analitica";

export type PeriodoPreset = "3M" | "6M" | "12M" | "MES_ACTUAL";

export const PERIODO_PRESET_LABELS: Record<PeriodoPreset, string> = {
  "3M": "Últimos 3 meses",
  "6M": "Últimos 6 meses",
  "12M": "Últimos 12 meses",
  MES_ACTUAL: "Mes actual",
};

export interface FiltrosUI {
  periodo: PeriodoPreset;
  territorio: string | "TODOS";
  modalidad: ModalidadVehiculo | "TODOS";
  tipoVehiculo: TipoVehiculo | "TODOS";
  combustible: TipoCombustible | "TODOS";
  medioTransporte: ModalidadVehiculo | "TODOS";
  area: string | "TODOS";
  tipoViaje: string | "TODOS";
}

export const FILTROS_INICIALES: FiltrosUI = {
  periodo: "3M",
  territorio: "TODOS",
  modalidad: "TODOS",
  tipoVehiculo: "TODOS",
  combustible: "TODOS",
  medioTransporte: "TODOS",
  area: "TODOS",
  tipoViaje: "TODOS",
};

export function calcularRangoPeriodo(preset: PeriodoPreset, ahora: Date = new Date()): { inicio: Date; fin: Date } {
  const fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
  if (preset === "MES_ACTUAL") {
    return { inicio: new Date(ahora.getFullYear(), ahora.getMonth(), 1), fin };
  }
  const mesesAtras = preset === "3M" ? 3 : preset === "6M" ? 6 : 12;
  return { inicio: new Date(ahora.getFullYear(), ahora.getMonth() - mesesAtras, ahora.getDate()), fin };
}

export function construirFiltrosAdaptador(filtros: FiltrosUI): FiltrosAnaliticaUI {
  const { inicio, fin } = calcularRangoPeriodo(filtros.periodo);
  return {
    periodoInicio: inicio,
    periodoFin: fin,
    territorioIds: filtros.territorio === "TODOS" ? undefined : [filtros.territorio],
    modalidades: filtros.modalidad === "TODOS" ? undefined : [filtros.modalidad],
    tiposVehiculo: filtros.tipoVehiculo === "TODOS" ? undefined : [filtros.tipoVehiculo],
    combustibles: filtros.combustible === "TODOS" ? undefined : [filtros.combustible],
    mediosTransporte: filtros.medioTransporte === "TODOS" ? undefined : [filtros.medioTransporte],
    areas: filtros.area === "TODOS" ? undefined : [filtros.area],
    tiposViaje: filtros.tipoViaje === "TODOS" ? undefined : [filtros.tipoViaje],
  };
}

export const TIPO_VEHICULO_LABELS: Record<TipoVehiculo, string> = {
  "sedan-compacto": "Sedán compacto",
  "sedan-ejecutivo": "Sedán ejecutivo",
  "suv-asignado": "SUV",
};

export const COMBUSTIBLE_LABELS: Record<TipoCombustible, string> = {
  GASOLINA: "Gasolina",
  DIESEL: "Diésel",
  ELECTRICO: "Eléctrico",
  HIBRIDO: "Híbrido",
};
