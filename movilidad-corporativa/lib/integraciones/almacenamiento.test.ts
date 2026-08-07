import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProveedorAlmacenamientoMock } from "./almacenamiento";

/**
 * Node no define `FileReader` globalmente (sí `File`/`Blob`, vía undici).
 * Este polyfill mínimo sólo cubre `readAsDataURL`, que es lo único que usa
 * el mock; en el navegador real (donde corre la app) se usa el nativo.
 */
class FileReaderPolyfill {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;
  error: unknown = null;

  readAsDataURL(blob: Blob) {
    blob
      .arrayBuffer()
      .then((buffer) => {
        const base64 = Buffer.from(buffer).toString("base64");
        this.result = `data:${blob.type || "application/octet-stream"};base64,${base64}`;
        this.onload?.();
      })
      .catch((error) => {
        this.error = error;
        this.onerror?.();
      });
  }
}

const globalConFileReader = globalThis as unknown as { FileReader?: unknown };
let originalFileReader: unknown;

beforeAll(() => {
  originalFileReader = globalConFileReader.FileReader;
  globalConFileReader.FileReader = FileReaderPolyfill;
});

afterAll(() => {
  globalConFileReader.FileReader = originalFileReader;
});

const proveedor = new ProveedorAlmacenamientoMock();

describe("ProveedorAlmacenamientoMock", () => {
  it("declara esReal: false", () => {
    expect(proveedor.meta.esReal).toBe(false);
  });

  it("guarda un archivo como data URL y conserva metadatos", async () => {
    const archivo = new File(["contenido de prueba"], "foto.png", { type: "image/png" });
    const guardado = await proveedor.guardarArchivo(archivo, "check-in");

    expect(guardado.url.startsWith("data:image/png;base64,")).toBe(true);
    expect(guardado.referencia).toBe(guardado.url);
    expect(guardado.nombreOriginal).toBe("foto.png");
    expect(guardado.tamanioBytes).toBe(archivo.size);
    expect(guardado.esSimulado).toBe(true);
  });

  it("eliminarArchivo no revienta (no-op)", async () => {
    await expect(proveedor.eliminarArchivo("data:image/png;base64,abc")).resolves.toBeUndefined();
  });
});
