/**
 * Punto de entrada centralizado para toda la configuración
 * Importa y reexporta desde módulos específicos
 */

export * from "./params";
export * from "./costos";
export * from "./emisiones";
export * from "./asignacion";

import { validarPesosAsignacion } from "./asignacion";

/**
 * Función para validar que la configuración es consistente
 * (útil para detectar errores antes de usar los servicios)
 */
export function validarConfiguracion(): {
  valida: boolean;
  errores: string[];
} {
  const errores: string[] = [];

  const pesosAsignacion = validarPesosAsignacion();
  if (!pesosAsignacion.validos) {
    errores.push(
      `Los pesos de ASIGNACION_CONFIG.pesos deben sumar 1.0, suman ${pesosAsignacion.sumaTotal}`
    );
  }

  return {
    valida: errores.length === 0,
    errores,
  };
}
