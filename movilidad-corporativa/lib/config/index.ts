/**
 * Punto de entrada centralizado para toda la configuración
 * Importa y reexporta desde módulos específicos
 */

export * from "./params";
export * from "./costos";
export * from "./emisiones";

/**
 * Función para validar que la configuración es consistente
 * (útil para detectar errores antes de usar los servicios)
 */
export function validarConfiguracion(): {
  valida: boolean;
  errores: string[];
} {
  const errores: string[] = [];

  // Validaciones básicas pueden añadirse aquí
  // Por ahora, retorna que todo es válido

  return {
    valida: errores.length === 0,
    errores,
  };
}
