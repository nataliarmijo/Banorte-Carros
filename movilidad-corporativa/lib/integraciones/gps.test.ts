import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { ProveedorGPSMock, desplazamientoSimulado } from "./gps";

const proveedor = new ProveedorGPSMock();

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  await db.delete();
  await db.open();
});

describe("ProveedorGPSMock", () => {
  it("declara esReal: false y una nota de simulación", () => {
    expect(proveedor.meta.esReal).toBe(false);
    expect(proveedor.meta.notaSimulacion).toBeTruthy();
  });

  it("simula una posición estable (determinística) cuando no hay lectura real", async () => {
    const vehiculos = [{ id: "veh-1", territorioId: "territorio-cdmx" }];
    const primera = await proveedor.obtenerUltimasPosiciones(vehiculos);
    const segunda = await proveedor.obtenerUltimasPosiciones(vehiculos);

    expect(primera.get("veh-1")?.latitud).toBe(segunda.get("veh-1")?.latitud);
    expect(primera.get("veh-1")?.longitud).toBe(segunda.get("veh-1")?.longitud);
    expect(primera.get("veh-1")?.esLecturaAlmacenada).toBe(false);
  });

  it("prioriza una lectura real de db.ubicacionesGPS sobre la simulación", async () => {
    await db.ubicacionesGPS.add({
      id: "gps-1",
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      usuarioCreadorId: "sistema",
      estatus: "ACTIVO",
      vehiculoId: "veh-1",
      latitud: 19.111,
      longitud: -99.222,
      timestampLectura: new Date().toISOString(),
      velocidad: 40,
      estadoVehiculo: "EN_USO",
    });

    const resultado = await proveedor.obtenerUltimasPosiciones([{ id: "veh-1", territorioId: "territorio-cdmx" }]);
    const lectura = resultado.get("veh-1");
    expect(lectura?.esLecturaAlmacenada).toBe(true);
    expect(lectura?.latitud).toBe(19.111);
    expect(lectura?.longitud).toBe(-99.222);
  });

  it("no revienta con un territorio desconocido: simplemente omite ese vehículo", async () => {
    const resultado = await proveedor.obtenerUltimasPosiciones([{ id: "veh-x", territorioId: "territorio-inexistente" }]);
    expect(resultado.has("veh-x")).toBe(false);
  });

  it("desplazamientoSimulado es determinístico por id", () => {
    const a = desplazamientoSimulado("veh-1", 0.7);
    const b = desplazamientoSimulado("veh-1", 0.7);
    expect(a).toEqual(b);
  });
});
