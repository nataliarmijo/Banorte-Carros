/**
 * Tipos y constantes compartidas por todas las integraciones externas
 * (/lib/integraciones). El proyecto no tiene ninguna integración real
 * conectada todavía: cada proveedor abajo describe el CONTRATO que una
 * implementación real deberá cumplir, con una implementación "mock"
 * funcional que alimenta la app hoy. Ver /lib/integraciones/README.md para
 * el detalle de qué reemplazar y con qué credenciales.
 */

/** Texto único usado en toda la UI para marcar una integración simulada. Ver components/badge-integracion-simulada.tsx. */
export const ETIQUETA_INTEGRACION_SIMULADA = "Integración simulada";

/** Metadatos que toda implementación (mock o real) de un proveedor expone, para mostrarlos consistentemente en la UI. */
export interface MetaProveedor {
  /** Nombre para mostrar, p. ej. "Mock interno" o "Uber for Business". */
  nombre: string;
  /** false en cualquier mock; true sólo en una implementación real conectada a credenciales válidas. */
  esReal: boolean;
  /** Texto corto para tooltips/badges cuando esReal es false. */
  notaSimulacion?: string;
}
