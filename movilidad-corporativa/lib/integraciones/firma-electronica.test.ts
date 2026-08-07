import { describe, expect, it } from "vitest";
import { ProveedorFirmaElectronicaMock } from "./firma-electronica";

const proveedor = new ProveedorFirmaElectronicaMock();

describe("ProveedorFirmaElectronicaMock", () => {
  it("declara esReal: false", () => {
    expect(proveedor.meta.esReal).toBe(false);
  });

  it("esFirmaValida es false para trazos vacíos o nulos", () => {
    expect(proveedor.esFirmaValida(null)).toBe(false);
    expect(proveedor.esFirmaValida("")).toBe(false);
  });

  it("esFirmaValida es true para un data URL no vacío", () => {
    expect(proveedor.esFirmaValida("data:image/png;base64,abc123")).toBe(true);
  });

  it("registrarFirma rechaza un trazo vacío", async () => {
    await expect(
      proveedor.registrarFirma("", { usuarioId: "user-1", nombreCompleto: "Ana López", documentoId: "res-1" })
    ).rejects.toThrow();
  });

  it("registrarFirma devuelve un comprobante simulado con referencia única", async () => {
    const comprobante = await proveedor.registrarFirma("data:image/png;base64,abc123", {
      usuarioId: "user-1",
      nombreCompleto: "Ana López",
      documentoId: "res-1",
    });
    expect(comprobante.esSimulado).toBe(true);
    expect(comprobante.firmanteNombre).toBe("Ana López");
    expect(comprobante.documentoId).toBe("res-1");
    expect(comprobante.referenciaProveedor).toMatch(/^FIRMA-SIM-/);
  });
});
