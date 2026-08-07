/**
 * Configuración del flujo de check-out digital (servicio-checkout).
 * Valores editables y sin hardcodear en la lógica de negocio.
 */

export const CHECKOUT_CONFIG = {
  // Mínimo de fotografías del vehículo requeridas al devolverlo.
  fotosMinimas: 1,

  // Consumo de combustible esperado (puntos porcentuales de tanque) cada 100
  // km, usado únicamente para mostrar una referencia de "consumido vs.
  // esperado" (supuesto de tanque promedio; no hay capacidad de tanque
  // modelada por vehículo).
  consumoEsperadoPorcentajePor100Km: 8,

  // Severidad de la Incidencia (Chunk 14) que se crea automáticamente según el motivo.
  severidad: {
    danosReportados: "ALTA",
    usoFueraDeHorarioNoAutorizado: "MEDIA",
  },
} as const;
