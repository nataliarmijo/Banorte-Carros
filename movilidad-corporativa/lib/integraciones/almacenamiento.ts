/**
 * IProveedorAlmacenamiento — fotos de check-in/check-out/incidencias. El
 * mock convierte cada archivo a un data URL (base64) y lo devuelve tal
 * cual: ese data URL ES la referencia que se guarda en `fotos: string[]`
 * en CheckIn/CheckOut/Incidencia (IndexedDB vía Dexie), no hay ningún
 * archivo binario aparte que subir o borrar.
 *
 * Implementación real futura: sustituir `ProveedorAlmacenamientoMock` por
 * un adaptador que suba el archivo a un bucket real (p. ej. Firebase
 * Storage — ver /lib/integraciones/firebase-adaptadores.ts) y devuelva su
 * URL pública/firmada en vez del data URL. Ver /lib/integraciones/README.md.
 */

import type { MetaProveedor } from "./tipos";

export interface ArchivoAlmacenado {
  /** En el mock, el propio data URL (también sirve como referencia para "eliminarlo": no hay nada más que borrar). */
  referencia: string;
  /** URL utilizable directamente en un <img src>; en el mock, igual a `referencia`. */
  url: string;
  nombreOriginal: string;
  tamanioBytes: number;
  fechaSubida: string;
  esSimulado: boolean;
}

export interface IProveedorAlmacenamiento {
  meta: MetaProveedor;
  /** Sube (simulado) un archivo a una carpeta lógica (p. ej. "check-in", "check-out", "incidencias"). */
  guardarArchivo(archivo: File, carpeta: string): Promise<ArchivoAlmacenado>;
  eliminarArchivo(referencia: string): Promise<void>;
}

function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(archivo);
  });
}

export class ProveedorAlmacenamientoMock implements IProveedorAlmacenamiento {
  meta: MetaProveedor = {
    nombre: "Mock interno de almacenamiento (IndexedDB)",
    esReal: false,
    notaSimulacion: "Los archivos se guardan como base64 dentro del navegador; no se suben a un servidor ni a la nube.",
  };

  async guardarArchivo(archivo: File, carpeta: string): Promise<ArchivoAlmacenado> {
    void carpeta; // sin uso en el mock: la implementación real subiría el archivo a esta carpeta lógica.
    const dataUrl = await leerComoDataUrl(archivo);
    return {
      referencia: dataUrl,
      url: dataUrl,
      nombreOriginal: archivo.name,
      tamanioBytes: archivo.size,
      fechaSubida: new Date().toISOString(),
      esSimulado: true,
    };
  }

  async eliminarArchivo(referencia: string): Promise<void> {
    void referencia;
    // No-op: en el mock el data URL vive únicamente dentro del arreglo `fotos` que lo referencia;
    // quitarlo de ese arreglo (en la UI) ya "elimina" la única copia que existe.
  }
}

export const proveedorAlmacenamiento: IProveedorAlmacenamiento = new ProveedorAlmacenamientoMock();
