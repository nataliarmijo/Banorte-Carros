/**
 * Configuración del motor de asignación inteligente de vehículos
 * (servicioAsignacion). Pesos y umbrales editables sin tocar la lógica de
 * negocio.
 */

export const ASIGNACION_CONFIG = {
  // Pesos del puntaje ponderado; deben sumar 1.0 (ver validarPesosAsignacion)
  pesos: {
    compatibilidad: 0.25,
    proximidad: 0.2,
    utilizacion: 0.2,
    balanceKilometraje: 0.15,
    riesgoMantenimiento: 0.1,
    incidencias: 0.1,
  },

  // Proximidad al origen: distancia (km, línea recta entre territorios) más
  // allá de la cual el puntaje de proximidad cae a 0; decae linealmente.
  proximidad: {
    distanciaMaximaReferenciaKm: 800,
    // Puntaje cuando no se conoce la ubicación del origen o del vehículo
    valorPorDefectoSinDatos: 0.5,
  },

  // Menor utilización reciente: cantidad de viajes en la ventana reciente
  // que ya representa "uso máximo esperado" (puntaje 0)
  utilizacion: {
    ventanaDias: 30,
    viajesMaximosEsperados: 20,
  },

  // Riesgo de mantenimiento: días hasta el próximo mantenimiento programado
  // por debajo de los cuales el riesgo empieza a penalizar el puntaje
  mantenimiento: {
    diasUmbralRiesgo: 14,
  },

  // Ausencia de incidencias recientes: cantidad de incidencias en la
  // ventana reciente que ya representa el máximo esperado (puntaje 0)
  incidencias: {
    ventanaDias: 90,
    maximasEsperadas: 5,
  },
} as const;

/** Verifica que los pesos configurados sumen 1.0 (100%). */
export function validarPesosAsignacion(): { validos: boolean; sumaTotal: number } {
  const sumaTotal = Object.values(ASIGNACION_CONFIG.pesos).reduce((acc, peso) => acc + peso, 0);
  return { validos: Math.abs(sumaTotal - 1) < 1e-9, sumaTotal };
}
