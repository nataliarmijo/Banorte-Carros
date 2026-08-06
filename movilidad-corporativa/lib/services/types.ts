/**
 * Tipos compartidos entre los servicios de negocio de Movilidad Corporativa.
 * Estos servicios son funciones puras, sin dependencias de React ni de UI.
 */

import type { TipoCombustible } from "@/lib/config/costos";

export type TipoVehiculo = "sedan-compacto" | "sedan-ejecutivo" | "suv-asignado";
export type Alternativa = "POOL" | "ASIGNADO" | "UBER";

/**
 * Resultado de un cálculo de costo. `desglose` es un mapa abierto de
 * concepto -> monto (MXN) cuya suma es igual a `costoTotal`; los conceptos
 * varían según la alternativa (vehículo vs. Uber) por lo que no se fuerza
 * una forma fija.
 */
export interface ResultadoCosto {
  costoTotal: number; // MXN
  moneda: "MXN";
  desglose: Record<string, number>;
  esEstimado: boolean;
  notas: string[];
}

export interface ResultadoEmisiones {
  totalGramosCo2: number;
  totalKgCo2: number;
  co2EvitadoGramos: number; // vs. escenario base (config)
  esEstimado: boolean;
  notas: string[];
}

export interface AlternativaComparada {
  tipo: Alternativa;
  vehiculoId?: string;
  vehiculoNombre?: string;
  disponible: boolean;
  compatible: boolean;
  costo: ResultadoCosto;
  emisiones: ResultadoEmisiones;
  puntuacion: number; // 0-100, mayor = más conveniente en costo; solo para ordenar
}

export interface ResultadoComparacion {
  alternativas: AlternativaComparada[];
  recomendada: Alternativa;
  requiereAprobacionEspecial: boolean;
  motivoAprobacionEspecial?: string;
  explicacion: string; // Explicación en lenguaje simple
  esEstimado: boolean;
  notas: string[];
}

export interface ResultadoAhorros {
  ahorroTotal: number; // MXN
  ahorrosPorConcepto: {
    mayorUsoPool: number;
    recomendarUberCuandoConviene: number;
    digitalizacion: number;
  };
  costoBaseEstimado: number;
  costoRealOptimizado: number;
  escenarioBase: {
    descripcion: string;
    supuestos: string[];
  };
  esEstimado: boolean;
  notas: string[];
}

/**
 * Borrador de solicitud de viaje: los datos mínimos necesarios para
 * comparar alternativas, previos a convertirse en una Solicitud formal.
 */
export interface BorradorSolicitud {
  territorioOrigen: string;
  territorioDestino: string;
  distanciaEstimadaKm: number;
  fecha: Date;
  horaEstimada: number; // 0-23
  pasajeros: number;
  tipoVehiculoRequerido?: TipoVehiculo;
  duracionEstimadaMinutos?: number;
}

/**
 * Vehículo Pool/Asignado candidato a asignación para una solicitud.
 */
export interface VehiculoDisponible {
  id: string;
  nombre: string;
  tipo: "POOL" | "ASIGNADO";
  tipoVehiculo: TipoVehiculo;
  tipoCombustible?: TipoCombustible; // por defecto GASOLINA
  territorio: string;
  disponible: boolean;
  capacidad: number;
}

/**
 * Respuesta cuando no hay datos suficientes para completar un cálculo.
 */
export interface ResultadoSinDatos {
  exito: false;
  error: "Sin datos suficientes";
  detalle: string;
}

export function crearResultadoSinDatos(detalle: string): ResultadoSinDatos {
  return {
    exito: false,
    error: "Sin datos suficientes",
    detalle,
  };
}

export function esResultadoSinDatos(valor: unknown): valor is ResultadoSinDatos {
  return (
    typeof valor === "object" &&
    valor !== null &&
    (valor as ResultadoSinDatos).exito === false &&
    (valor as ResultadoSinDatos).error === "Sin datos suficientes"
  );
}
