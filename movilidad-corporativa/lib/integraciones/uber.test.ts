import { describe, expect, it } from "vitest";
import { calcularCostoUber } from "@/lib/services/servicio-costos";
import { ProveedorUberMock } from "./uber";

const proveedor = new ProveedorUberMock();

describe("ProveedorUberMock", () => {
  it("declara esReal: false", () => {
    expect(proveedor.meta.esReal).toBe(false);
  });

  it("cotizar() es consistente con servicioCostos.calcularCostoUber (no reimplementa el cálculo)", async () => {
    const cotizacion = await proveedor.cotizar({ km: 20, duracionMinutos: 30, factorDemanda: 1 });
    const esperado = calcularCostoUber({ km: 20, duracionMinutos: 30, factorDemanda: 1 });
    expect(cotizacion.costoTotal).toBe(esperado.costoTotal);
    expect(cotizacion.esSimulado).toBe(true);
  });

  it("solicitarViaje() nunca dice que reservó un Uber real", async () => {
    const confirmacion = await proveedor.solicitarViaje({
      km: 15,
      origen: "Torre Banorte",
      destino: "Aeropuerto",
      pasajero: "user-1",
    });
    expect(confirmacion.esSimulado).toBe(true);
    expect(confirmacion.mensaje.toLowerCase()).toContain("simulad");
    expect(confirmacion.referenciaProveedor).toMatch(/^UBER-SIM-/);
  });

  it("genera referencias distintas en solicitudes sucesivas", async () => {
    const a = await proveedor.solicitarViaje({ km: 5, origen: "A", destino: "B", pasajero: "user-1" });
    const b = await proveedor.solicitarViaje({ km: 5, origen: "A", destino: "B", pasajero: "user-1" });
    expect(a.referenciaProveedor).not.toBe(b.referenciaProveedor);
  });
});
