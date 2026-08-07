/**
 * servicioFlota
 * Cálculos puros sobre el catálogo de vehículos: composición de la flotilla
 * (Pool vs. Asignado, para medir el avance hacia la meta 60/40 del dashboard
 * ejecutivo del Chunk 15) y tendencia de utilización reciente de un
 * vehículo (viajes por semana).
 */

import type { ModalidadVehiculo, Reservacion } from "@/lib/models";

export interface ComposicionFlotilla {
  /** Vehículos Pool + Asignado; excluye Uber (no es flotilla propia). */
  totalFlota: number;
  poolCount: number;
  asignadoCount: number;
  poolPorcentaje: number; // 0-100
  asignadoPorcentaje: number; // 0-100
}

export function calcularComposicionFlotilla(vehiculos: { modalidad: ModalidadVehiculo }[]): ComposicionFlotilla {
  const flota = vehiculos.filter((v) => v.modalidad === "POOL" || v.modalidad === "ASIGNADO");
  const poolCount = flota.filter((v) => v.modalidad === "POOL").length;
  const asignadoCount = flota.filter((v) => v.modalidad === "ASIGNADO").length;
  const totalFlota = flota.length;

  return {
    totalFlota,
    poolCount,
    asignadoCount,
    poolPorcentaje: totalFlota > 0 ? Math.round((poolCount / totalFlota) * 1000) / 10 : 0,
    asignadoPorcentaje: totalFlota > 0 ? Math.round((asignadoCount / totalFlota) * 1000) / 10 : 0,
  };
}

export interface PuntoTendenciaUtilizacion {
  etiqueta: string;
  viajes: number;
}

function inicioDeSemana(fecha: Date): Date {
  const resultado = new Date(fecha);
  resultado.setHours(0, 0, 0, 0);
  const dia = resultado.getDay();
  const offsetALunes = dia === 0 ? 6 : dia - 1;
  resultado.setDate(resultado.getDate() - offsetALunes);
  return resultado;
}

/** Viajes por semana de un vehículo en las últimas `semanas` (incluye la semana actual), más reciente al final. */
export function calcularTendenciaUtilizacion(
  reservaciones: Pick<Reservacion, "fechaInicio" | "estadoReservacion">[],
  semanas: number,
  ahora: Date = new Date()
): PuntoTendenciaUtilizacion[] {
  const msPorSemana = 7 * 24 * 60 * 60 * 1000;
  const inicioSemanaActual = inicioDeSemana(ahora);

  const puntos: PuntoTendenciaUtilizacion[] = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const inicioBucket = new Date(inicioSemanaActual.getTime() - i * msPorSemana);
    const finBucket = new Date(inicioBucket.getTime() + msPorSemana);
    const viajes = reservaciones.filter((r) => {
      if (r.estadoReservacion === "CANCELADA") return false;
      const fecha = new Date(r.fechaInicio).getTime();
      return fecha >= inicioBucket.getTime() && fecha < finBucket.getTime();
    }).length;
    puntos.push({ etiqueta: i === 0 ? "Esta semana" : `Hace ${i} semana${i > 1 ? "s" : ""}`, viajes });
  }
  return puntos;
}

export const servicioFlota = {
  calcularComposicionFlotilla,
  calcularTendenciaUtilizacion,
};
