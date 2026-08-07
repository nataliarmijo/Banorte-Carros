/**
 * Pruebas del generador de datos históricos (/analitica): determinismo,
 * ausencia de fechas futuras, y que sus ids nunca colisionan con el seed
 * base (para no afectar los conteos que asumen las demás pantallas/pruebas).
 */

import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData, initializeHistoricalData } from "@/lib/seed/init";
import { demoUsuarios, demoVehiculos } from "@/lib/seed/demo-data";
import { generarDatosHistoricos } from "@/lib/seed/historico";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("generarDatosHistoricos", () => {
  it("es determinista: misma entrada -> misma cantidad y mismos ids", () => {
    const ahora = new Date(2026, 7, 6, 12, 0, 0);
    const a = generarDatosHistoricos(demoVehiculos, demoUsuarios, ahora);
    const b = generarDatosHistoricos(demoVehiculos, demoUsuarios, ahora);

    expect(a.solicitudes.length).toBe(b.solicitudes.length);
    expect(a.solicitudes.map((s) => s.id)).toEqual(b.solicitudes.map((s) => s.id));
    expect(a.reservaciones.map((r) => r.id)).toEqual(b.reservaciones.map((r) => r.id));
    expect(a.solicitudes.length).toBeGreaterThan(50);
    expect(a.reservaciones.length).toBeGreaterThan(0);
    // checkOuts sólo se generan para reservaciones de flotilla (Pool/Asignado), no para Uber.
    expect(a.checkOuts.length).toBeGreaterThan(0);
    expect(a.checkOuts.length).toBeLessThanOrEqual(a.reservaciones.length);
    expect(a.checkOuts.map((c) => c.id)).toEqual(b.checkOuts.map((c) => c.id));
  });

  it("nunca genera solicitudes con fecha futura respecto a 'ahora'", () => {
    const ahora = new Date(2026, 7, 6, 12, 0, 0);
    const datos = generarDatosHistoricos(demoVehiculos, demoUsuarios, ahora);

    for (const solicitud of datos.solicitudes) {
      expect(new Date(solicitud.fechaCreacion).getTime()).toBeLessThanOrEqual(ahora.getTime());
    }
    for (const reservacion of datos.reservaciones) {
      expect(new Date(reservacion.fechaFin).getTime()).toBeLessThanOrEqual(ahora.getTime() + 24 * 60 * 60 * 1000);
    }
  });

  it("usa ids con prefijo *-hist-* que no colisionan con el seed base", () => {
    const idsBase = new Set([
      ...demoVehiculos.map((v) => v.id),
      ...demoUsuarios.map((u) => u.id),
    ]);
    const datos = generarDatosHistoricos(demoVehiculos, demoUsuarios, new Date(2026, 7, 6));

    for (const s of datos.solicitudes) {
      expect(s.id.startsWith("sol-hist-")).toBe(true);
      expect(idsBase.has(s.id)).toBe(false);
    }
    for (const r of datos.reservaciones) {
      expect(r.id.startsWith("res-hist-")).toBe(true);
    }
  });

  it("cada reservación referencia una solicitud COMPLETADA existente y un vehículo real", () => {
    const datos = generarDatosHistoricos(demoVehiculos, demoUsuarios, new Date(2026, 7, 6));
    const solicitudesPorId = new Map(datos.solicitudes.map((s) => [s.id, s]));
    const vehiculoIds = new Set(demoVehiculos.map((v) => v.id));

    for (const reservacion of datos.reservaciones) {
      const solicitud = solicitudesPorId.get(reservacion.solicitudId);
      expect(solicitud).toBeDefined();
      expect(solicitud?.estadoSolicitud).toBe("COMPLETADA");
      if (reservacion.modalidadAsignada !== "UBER") {
        expect(vehiculoIds.has(reservacion.vehiculoId)).toBe(true);
      }
    }
  });
});

describe("initializeHistoricalData", () => {
  it("es aditivo: no cambia los conteos que el resto de la app asume del seed base", async () => {
    await initializeDemoData();
    const vehiculosAntes = await db.vehiculos.count();
    const usuariosAntes = await db.usuarios.count();

    await initializeHistoricalData();

    expect(await db.vehiculos.count()).toBe(vehiculosAntes);
    expect(await db.usuarios.count()).toBe(usuariosAntes);

    const solicitudesHist = await db.solicitudes.where("id").startsWith("sol-hist-").count();
    expect(solicitudesHist).toBeGreaterThan(0);
  });

  it("es idempotente: llamarlo dos veces no duplica los registros históricos", async () => {
    await initializeHistoricalData();
    const conteoDespuesPrimeraVez = await db.solicitudes.where("id").startsWith("sol-hist-").count();

    const resultado = await initializeHistoricalData();

    expect(resultado.seeded).toBe(false);
    expect(await db.solicitudes.where("id").startsWith("sol-hist-").count()).toBe(conteoDespuesPrimeraVez);
  });
});
