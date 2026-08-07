/**
 * Pruebas de integración de /analitica sobre el adaptador real (Dexie vía
 * fake-indexeddb). Cubre: que el dashboard no se rompe con el seed base +
 * histórico generado, que los filtros globales acotan las cifras, y el
 * requisito explícito de verificación: que completar más viajes Pool o
 * cambiar la modalidad de un vehículo (flujo de /vehiculos, Chunk 12)
 * actualiza en consecuencia las cifras del dashboard.
 */

import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import { cambiarModalidad } from "@/lib/adapters/vehiculos";
import { obtenerDashboardAnalitica } from "./analitica";

const ADMIN_ID = "user-admin";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("obtenerDashboardAnalitica", () => {
  it("arma un dashboard completo sin romperse, sembrando datos históricos automáticamente", async () => {
    const dashboard = await obtenerDashboardAnalitica();

    expect(dashboard.kpis.length).toBeGreaterThan(0);
    expect(dashboard.opcionesFiltro.territorios.length).toBeGreaterThan(0);
    expect(dashboard.composicion.evolucionMensual.length).toBe(12);
    expect(dashboard.emisiones.factoresUsados.length).toBeGreaterThan(0);

    const totalUnidades = dashboard.kpis.find((k) => k.id === "total-unidades");
    expect(totalUnidades?.valorActual).toBeGreaterThan(0);
  });

  it("un filtro de territorio que no tiene vehículos produce 'sin datos suficientes' (nulls) en vez de romperse", async () => {
    await initializeDemoData();
    // territorio-cdmx sí tiene vehículos; probamos un filtro que no coincide con ningún vehículo del catálogo (área inexistente).
    const dashboard = await obtenerDashboardAnalitica({ areas: ["Área que no existe"] });
    const tasaAprobacion = dashboard.kpis.find((k) => k.id === "tasa-aprobacion");
    expect(tasaAprobacion?.valorActual).toBe(0);
    expect(dashboard.ahorro.resultado).toMatchObject({ exito: false });
  });

  it("el filtro de territorio acota la composición de flotilla al territorio elegido", async () => {
    await initializeDemoData();
    const dashboardCompleto = await obtenerDashboardAnalitica();
    const dashboardFiltrado = await obtenerDashboardAnalitica({ territorioIds: ["territorio-cdmx"] });

    expect(dashboardFiltrado.composicion.actual.totalFlota).toBeLessThanOrEqual(dashboardCompleto.composicion.actual.totalFlota);
    for (const fila of dashboardFiltrado.composicion.porTerritorio) {
      expect(fila.clave).toBe("territorio-cdmx");
    }
  });

  it("cambiar la modalidad de un vehículo (Chunk 12, /vehiculos) mueve el % Pool del dashboard", async () => {
    await initializeDemoData();

    const antes = await obtenerDashboardAnalitica();
    const pctPoolAntes = antes.kpis.find((k) => k.id === "pct-pool")!.valorActual;

    // veh-5 es ASIGNADO en el seed base (demo-data.ts); migrarlo a Pool debe subir el % Pool.
    const resultado = await cambiarModalidad("veh-5", "POOL", ADMIN_ID);
    expect(resultado).not.toMatchObject({ exito: false });

    const despues = await obtenerDashboardAnalitica();
    const pctPoolDespues = despues.kpis.find((k) => k.id === "pct-pool")!.valorActual;

    expect(pctPoolDespues).toBeGreaterThan(pctPoolAntes);
    expect(despues.composicion.actual.poolCount).toBe(antes.composicion.actual.poolCount + 1);
  });

  it("completar más viajes Pool en el periodo actual mueve el costo total de movilidad y los viajes completados del dashboard", async () => {
    await initializeDemoData();

    const antes = await obtenerDashboardAnalitica();
    const viajesAntes = antes.kpis.find((k) => k.id === "viajes-completados")!.valorActual;
    const costoAntes = antes.kpis.find((k) => k.id === "costo-total-movilidad")!.valorActual;

    const ahora = new Date();
    const solicitudId = "sol-analitica-test-1";
    const reservacionId = "res-analitica-test-1";
    const nowIso = ahora.toISOString();

    await db.solicitudes.add({
      id: solicitudId,
      fechaCreacion: nowIso,
      fechaActualizacion: nowIso,
      usuarioCreadorId: ADMIN_ID,
      estatus: "COMPLETADA",
      folio: "MOV-TEST-000001",
      usuarioSolicitanteId: "user-1",
      territorioId: "territorio-cdmx",
      fechaSolicitud: nowIso.slice(0, 10),
      horaInicioDeseada: "09:00",
      horaFinDeseada: "11:00",
      origen: "Oficinas CDMX",
      destino: "Cliente corporativo",
      distanciaEstimadaKm: 40,
      duracionEstimadaMinutos: 60,
      pasajeros: 1,
      motivoViaje: "Visita a cliente",
      tipoViaje: "Corporativo",
      modalidadRequerida: "POOL",
      costoEstimado: 500,
      estadoSolicitud: "COMPLETADA",
      prioridad: "MEDIA",
    });
    await db.reservaciones.add({
      id: reservacionId,
      fechaCreacion: nowIso,
      fechaActualizacion: nowIso,
      usuarioCreadorId: ADMIN_ID,
      estatus: "COMPLETADA",
      solicitudId,
      vehiculoId: "veh-1",
      modalidadAsignada: "POOL",
      fechaInicio: nowIso,
      fechaFin: nowIso,
      costoEstimado: 500,
      costoReal: 500,
      estadoReservacion: "COMPLETADA",
    });
    await db.checkOuts.add({
      id: "checkout-analitica-test-1",
      fechaCreacion: nowIso,
      fechaActualizacion: nowIso,
      usuarioCreadorId: ADMIN_ID,
      estatus: "COMPLETADA",
      reservacionId,
      usuarioId: "user-1",
      fechaHoraCheckOut: nowIso,
      kilometrajeFinal: 1000,
      combustibleRestante: 60,
      fotos: [],
      estadoVehiculo: "BUENO",
      llavesDevueltas: true,
      kilometrosRecorridos: 40,
      duracionRealMinutos: 60,
      retrasoMinutos: 0,
      diferenciaCombustiblePorcentaje: 0,
      fueraDeHorarioNoAutorizado: false,
      costoReal: 999,
      emisionesRealesGramos: 5000,
      incidenciasCreadasIds: [],
    });

    const despues = await obtenerDashboardAnalitica();
    const viajesDespues = despues.kpis.find((k) => k.id === "viajes-completados")!.valorActual;
    const costoDespues = despues.kpis.find((k) => k.id === "costo-total-movilidad")!.valorActual;

    expect(viajesDespues).toBe(viajesAntes + 1);
    expect(costoDespues).toBeGreaterThan(costoAntes);
  });
});
