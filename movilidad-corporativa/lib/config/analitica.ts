/**
 * Configuración del dashboard ejecutivo /analitica: metas globales,
 * umbrales de utilización (sub/sobreutilización), supuestos de ROI y
 * horizonte de datos históricos. Editable sin tocar la lógica de negocio.
 */

export const ANALITICA_CONFIG = {
  // Tamaño de flotilla objetivo a nivel compañía (referencia de escala del
  // rollout completo; la demo opera con una flotilla mucho más pequeña).
  metaFlotaTotalUnidades: 1180,

  // Meta de composición Pool/Asignado a nivel compañía (60/40); las metas
  // por territorio en /lib/config/metas.ts la afinan donde existan.
  metaPoolPorcentaje: 60,
  metaAsignadoPorcentaje: 40,

  // Meta de utilización general cuando el territorio no tiene una meta propia en metas.ts.
  metaUtilizacionPorDefecto: 75,

  // Umbrales de viajes/mes por vehículo para clasificar sub/sobreutilización.
  utilizacion: {
    minimoViajesPorMes: 6, // por debajo: subutilizado
    maximoViajesPorMes: 26, // por arriba: sobreutilizado
  },

  // Meta de tasa de aprobación de solicitudes (aprobadas / (aprobadas + rechazadas)).
  metaTasaAprobacionPorcentaje: 85,

  // Inversión estimada de la iniciativa de movilidad corporativa (plataforma,
  // integración, adopción), usada para estimar el ROI a partir del ahorro acumulado.
  costoImplementacionEstimadoMx: 850000,

  // Horas administrativas ahorradas por viaje digitalizado (vs. coordinar por
  // llamadas/correo), usadas para el KPI "horas administrativas ahorradas".
  horasAhorradasPorViajeDigitalizado: 0.35,

  // Ventana de datos históricos que alimenta las gráficas de evolución mensual.
  mesesHistoricos: 12,
} as const;
