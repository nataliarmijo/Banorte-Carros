/**
 * servicioIncidencias
 * Cálculo puro del indicador "incidencias por cada 100 viajes" que usará el
 * dashboard ejecutivo (Chunk 15) para medir la calidad operativa de la
 * flotilla: (incidencias / viajes) * 100.
 */

export interface TasaIncidencias {
  totalIncidencias: number;
  totalViajes: number;
  /** Incidencias por cada 100 viajes; 0 si no hay viajes registrados. */
  tasaPorCadaCienViajes: number;
}

export function calcularIncidenciasPorCadaCienViajes(totalIncidencias: number, totalViajes: number): TasaIncidencias {
  if (!Number.isFinite(totalViajes) || totalViajes <= 0) {
    return { totalIncidencias, totalViajes: Math.max(0, totalViajes), tasaPorCadaCienViajes: 0 };
  }

  const tasaPorCadaCienViajes = Math.round((totalIncidencias / totalViajes) * 100 * 10) / 10;
  return { totalIncidencias, totalViajes, tasaPorCadaCienViajes };
}

export const servicioIncidencias = {
  calcularIncidenciasPorCadaCienViajes,
};
