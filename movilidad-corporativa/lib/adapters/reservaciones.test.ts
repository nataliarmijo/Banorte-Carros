/**
 * Pruebas de integración de /reservaciones sobre el adaptador real (Dexie
 * vía fake-indexeddb): detalle de una solicitud (incluyendo el puntaje de
 * asignación recalculado, Chunk 19) y cancelación.
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import { esResultadoSinDatos } from "@/lib/services/types";
import { cancelarSolicitud, esCancelable, obtenerDetalleSolicitud, listarSolicitudesDeUsuario } from "./reservaciones";

beforeEach(async () => {
  await initializeDemoData();
});

afterEach(async () => {
  await db.delete();
  await db.open();
});

describe("obtenerDetalleSolicitud", () => {
  it("arma el detalle completo (timeline, historial, vehículo) de una solicitud existente", async () => {
    const detalle = await obtenerDetalleSolicitud("sol-9");
    expect(detalle).not.toBeNull();
    expect(detalle?.solicitud.folio).toBe("MOV-2025-000009");
    expect(detalle?.reservacion?.vehiculoId).toBe("veh-7");
    expect(detalle?.vehiculoNombre).toContain("STU-901");
    expect(detalle?.timeline.length).toBeGreaterThan(0);
  });

  it("devuelve null para una solicitud inexistente", async () => {
    const detalle = await obtenerDetalleSolicitud("sol-no-existe");
    expect(detalle).toBeNull();
  });

  it("calcula el puntaje de asignación recalculado (Pool/Asignado), con los 6 criterios ponderados", async () => {
    const detalle = await obtenerDetalleSolicitud("sol-9");
    expect(detalle?.puntajeAsignacion).not.toBeNull();
    const desglose = detalle!.puntajeAsignacion!.desglose;
    expect(Object.keys(desglose).sort()).toEqual(
      ["balanceKilometraje", "compatibilidad", "incidencias", "proximidad", "riesgoMantenimiento", "utilizacion"].sort()
    );
    for (const valor of Object.values(desglose)) {
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThanOrEqual(1);
    }
    expect(detalle!.puntajeAsignacion!.puntajeTotal).toBeGreaterThanOrEqual(0);
    expect(detalle!.puntajeAsignacion!.puntajeTotal).toBeLessThanOrEqual(100);
  });

  it("no calcula puntaje de asignación para un viaje en Uber (no es flotilla propia)", async () => {
    const detalle = await obtenerDetalleSolicitud("sol-4");
    expect(detalle?.reservacion?.modalidadAsignada).toBe("UBER");
    expect(detalle?.puntajeAsignacion).toBeNull();
  });
});

describe("cancelarSolicitud", () => {
  it("cancela una solicitud cancelable y su reservación asociada", async () => {
    const solicitudes = await listarSolicitudesDeUsuario("user-1");
    const cancelable = solicitudes.find((s) => esCancelable(s.solicitud));
    expect(cancelable).toBeDefined();

    const resultado = await cancelarSolicitud(cancelable!.solicitud.id, "user-1");
    expect(esResultadoSinDatos(resultado)).toBe(false);
    if (esResultadoSinDatos(resultado)) return;
    expect(resultado.estadoSolicitud).toBe("CANCELADA");

    if (cancelable!.reservacion) {
      const reservacionActualizada = await db.reservaciones.get(cancelable!.reservacion.id);
      expect(reservacionActualizada?.estadoReservacion).toBe("CANCELADA");
    }
  });

  it("rechaza cancelar una solicitud que ya no es cancelable (p. ej. ya completada)", async () => {
    const resultado = await cancelarSolicitud("sol-1", "user-1");
    expect(esResultadoSinDatos(resultado)).toBe(true);
  });

  it("rechaza cancelar una solicitud inexistente", async () => {
    const resultado = await cancelarSolicitud("sol-no-existe", "user-1");
    expect(esResultadoSinDatos(resultado)).toBe(true);
  });
});
