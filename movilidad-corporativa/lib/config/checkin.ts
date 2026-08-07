/**
 * Configuración del flujo de check-in digital (servicio-checkin).
 * Valores editables y sin hardcodear en la lógica de negocio.
 */

export const CHECKIN_CONFIG = {
  // El check-in se habilita a partir de esta cantidad de horas antes de la
  // salida programada (no hay límite superior: llegar tarde no bloquea el check-in).
  ventanaPreviaHoras: 24,

  // Cuántos km por encima del último kilometraje registrado del vehículo se
  // consideran razonables al capturar el kilometraje inicial (evita errores
  // de captura evidentes sin bloquear variaciones normales).
  kilometrajeExcedenteRazonableKm: 150,

  combustible: {
    minimoPorcentaje: 0,
    maximoPorcentaje: 100,
  },

  // Mínimo de fotografías del vehículo requeridas para completar el check-in.
  fotosMinimas: 1,
} as const;
