/**
 * Pruebas de integración de /operacion (Admin Flota) sobre el adaptador real
 * (Dexie vía fake-indexeddb, mismo patrón que checkin.test.ts / checkout.test.ts
 * / aprobaciones.test.ts): panel del día, indicadores, marcar
 * entrega/devolución como coordinada, y reasignación manual reutilizando
 * `reasignarManualmente` del Chunk 5.
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import { esResultadoSinDatos } from "@/lib/services/types";
import type { Reservacion, Solicitud } from "@/lib/models";
import {
  fechaLocalISO,
  listarCandidatosReasignacion,
  marcarCoordinacion,
  obtenerPanelOperativo,
  reasignarVehiculoOperacion,
} from "./operacion";

const ADMIN_ID = "user-admin"; // territorio-cdmx

function crearSolicitud(overrides: Partial<Solicitud> & Pick<Solicitud, "id" | "fechaSolicitud" | "estadoSolicitud">): Solicitud {
  const ahora = new Date().toISOString();
  return {
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: "user-1",
    estatus: "ACTIVO",
    folio: `MOV-TEST-${overrides.id}`,
    usuarioSolicitanteId: "user-1",
    territorioId: "territorio-cdmx",
    horaInicioDeseada: "09:00",
    horaFinDeseada: "13:00",
    origen: "Torre Banorte",
    destino: "Sucursal Reforma",
    motivoViaje: "Prueba de operación",
    tipoViaje: "Corporativo",
    modalidadRequerida: "POOL",
    prioridad: "MEDIA",
    ...overrides,
  };
}

function crearReservacion(overrides: Partial<Reservacion> & Pick<Reservacion, "id" | "solicitudId" | "vehiculoId" | "fechaInicio" | "fechaFin" | "estadoReservacion">): Reservacion {
  const ahora = new Date().toISOString();
  return {
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: "user-1",
    estatus: "ACTIVO",
    modalidadAsignada: "POOL",
    costoEstimado: 200,
    costoReal: 0,
    ...overrides,
  };
}

describe("/operacion (Admin Flota)", () => {
  beforeEach(async () => {
    await initializeDemoData();
  });

  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it("lista los vehículos Pool/Asignado (excluye Uber) con sus indicadores de estado operativo", async () => {
    const panel = await obtenerPanelOperativo();
    expect(panel.vehiculos.some((v) => v.vehiculo.modalidad === "UBER")).toBe(false);
    expect(panel.vehiculos.length).toBe(7); // demoVehiculos: 8 totales, 1 es UBER (veh-4)

    const disponibles = panel.vehiculos.filter((v) => v.vehiculo.estadoOperativo === "DISPONIBLE").length;
    const enMantenimiento = panel.vehiculos.filter((v) => v.vehiculo.estadoOperativo === "EN_MANTENIMIENTO").length;
    expect(enMantenimiento).toBe(1); // veh-3
    expect(disponibles).toBeGreaterThan(0);
  });

  it("incluye las incidencias abiertas (no resueltas) con el folio de la solicitud asociada", async () => {
    const panel = await obtenerPanelOperativo();
    const incidencia = panel.incidencias.find((i) => i.incidencia.id === "inc-1");
    expect(incidencia).toBeDefined();
    expect(incidencia?.vehiculo?.id).toBe("veh-2");
    expect(incidencia?.folioSolicitud).toBe("MOV-2025-000002");
  });

  it("detecta una entrega pendiente hoy (salida planeada hoy, todavía sin check-in)", async () => {
    const hoy = fechaLocalISO(new Date());
    await db.solicitudes.add(
      crearSolicitud({ id: "sol-op-entrega", fechaSolicitud: hoy, estadoSolicitud: "ASIGNADA" })
    );
    await db.reservaciones.add(
      crearReservacion({
        id: "res-op-entrega",
        solicitudId: "sol-op-entrega",
        vehiculoId: "veh-8",
        fechaInicio: new Date().toISOString(),
        fechaFin: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        estadoReservacion: "ASIGNADA",
      })
    );

    const panel = await obtenerPanelOperativo(hoy);
    const fila = panel.filas.find((f) => f.solicitud.id === "sol-op-entrega");
    expect(fila).toBeDefined();
    expect(fila?.esEntregaPendiente).toBe(true);
    expect(fila?.esDevolucionPendiente).toBe(false);
    expect(fila?.vehiculo?.id).toBe("veh-8");
  });

  it("detecta una devolución retrasada, siempre visible en 'retrasos' sin importar la fecha filtrada", async () => {
    const hace2h = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const hoy = fechaLocalISO(new Date());
    await db.solicitudes.add(crearSolicitud({ id: "sol-op-retraso", fechaSolicitud: hoy, estadoSolicitud: "EN_CURSO" }));
    await db.reservaciones.add(
      crearReservacion({
        id: "res-op-retraso",
        solicitudId: "sol-op-retraso",
        vehiculoId: "veh-6",
        fechaInicio: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        fechaFin: hace2h.toISOString(),
        estadoReservacion: "EN_CURSO",
      })
    );

    const panelHoy = await obtenerPanelOperativo(hoy);
    const filaHoy = panelHoy.filas.find((f) => f.solicitud.id === "sol-op-retraso");
    expect(filaHoy?.esRetrasada).toBe(true);
    expect(filaHoy?.minutosRetraso).toBeGreaterThanOrEqual(119);
    expect(panelHoy.retrasos.some((f) => f.solicitud.id === "sol-op-retraso")).toBe(true);

    // Un día distinto a hoy no debe listar esta reservación en la tabla del día...
    const manana = fechaLocalISO(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const panelManana = await obtenerPanelOperativo(manana);
    expect(panelManana.filas.some((f) => f.solicitud.id === "sol-op-retraso")).toBe(false);
    // ...pero el retraso sigue siendo visible en vivo, sin importar la fecha filtrada.
    expect(panelManana.retrasos.some((f) => f.solicitud.id === "sol-op-retraso")).toBe(true);
  });

  it("marcar una entrega como coordinada queda registrado y se refleja en el panel", async () => {
    const hoy = fechaLocalISO(new Date());
    await db.solicitudes.add(crearSolicitud({ id: "sol-op-coord", fechaSolicitud: hoy, estadoSolicitud: "ASIGNADA" }));
    await db.reservaciones.add(
      crearReservacion({
        id: "res-op-coord",
        solicitudId: "sol-op-coord",
        vehiculoId: "veh-8",
        fechaInicio: new Date().toISOString(),
        fechaFin: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        estadoReservacion: "ASIGNADA",
      })
    );

    const antes = await obtenerPanelOperativo(hoy);
    expect(antes.filas.find((f) => f.solicitud.id === "sol-op-coord")?.entregaCoordinada).toBe(false);

    await marcarCoordinacion("res-op-coord", "ENTREGA", ADMIN_ID);

    const despues = await obtenerPanelOperativo(hoy);
    expect(despues.filas.find((f) => f.solicitud.id === "sol-op-coord")?.entregaCoordinada).toBe(true);

    const auditorias = await db.registrosAuditoria.where("entidadId").equals("res-op-coord").toArray();
    expect(auditorias.some((a) => a.accion === "ENTREGA_COORDINADA" && a.usuarioId === ADMIN_ID)).toBe(true);
  });

  it("lista candidatos de reasignación compatibles (misma modalidad y territorio, disponibles, excluyendo el actual)", async () => {
    // Periodo lejano en el futuro para no chocar con las reservaciones de la
    // demo ancladas a fechas fijas (p. ej. res-5 ocupa veh-8 el día de hoy).
    const enTreintaDias = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const reservacion = crearReservacion({
      id: "res-op-candidatos",
      solicitudId: "sol-op-candidatos",
      vehiculoId: "veh-1", // POOL, territorio-cdmx
      fechaInicio: new Date(enTreintaDias).toISOString(),
      fechaFin: new Date(enTreintaDias + 3 * 60 * 60 * 1000).toISOString(),
      estadoReservacion: "ASIGNADA",
      modalidadAsignada: "POOL",
    });
    await db.reservaciones.add(reservacion);

    const candidatos = await listarCandidatosReasignacion(reservacion, "territorio-cdmx");
    const ids = candidatos.map((v) => v.id);

    expect(ids).toContain("veh-8"); // POOL, cdmx, disponible
    expect(ids).not.toContain("veh-1"); // es el vehículo actual
    expect(ids).not.toContain("veh-7"); // ASIGNADO, no POOL
  });

  it("reasigna un vehículo 'En curso' y sincroniza el estado operativo de ambas unidades", async () => {
    const ahora = new Date();
    await db.solicitudes.add(
      crearSolicitud({ id: "sol-op-swap", fechaSolicitud: fechaLocalISO(ahora), estadoSolicitud: "EN_CURSO" })
    );
    await db.reservaciones.add(
      crearReservacion({
        id: "res-op-swap",
        solicitudId: "sol-op-swap",
        vehiculoId: "veh-1",
        fechaInicio: new Date(ahora.getTime() - 60 * 60 * 1000).toISOString(),
        fechaFin: new Date(ahora.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        estadoReservacion: "EN_CURSO",
      })
    );
    await db.vehiculos.update("veh-1", { estadoOperativo: "OCUPADO", disponibilidadActual: false });

    const resultado = await reasignarVehiculoOperacion({
      solicitudId: "sol-op-swap",
      vehiculoNuevoId: "veh-8",
      justificacion: "El vehículo original presentó una falla en el camino",
      usuarioId: ADMIN_ID,
    });
    if (esResultadoSinDatos(resultado)) {
      throw new Error(`se esperaba una reasignación exitosa: ${resultado.detalle}`);
    }
    expect(resultado.reservacion.vehiculoId).toBe("veh-8");

    const vehiculoAnterior = await db.vehiculos.get("veh-1");
    const vehiculoNuevo = await db.vehiculos.get("veh-8");
    expect(vehiculoAnterior?.estadoOperativo).toBe("DISPONIBLE");
    expect(vehiculoAnterior?.disponibilidadActual).toBe(true);
    expect(vehiculoNuevo?.estadoOperativo).toBe("OCUPADO");
    expect(vehiculoNuevo?.disponibilidadActual).toBe(false);
  });

  it("reasigna un vehículo todavía no recogido sin alterar el estado operativo de las unidades", async () => {
    const ahora = new Date();
    await db.solicitudes.add(
      crearSolicitud({ id: "sol-op-swap2", fechaSolicitud: fechaLocalISO(ahora), estadoSolicitud: "ASIGNADA" })
    );
    await db.reservaciones.add(
      crearReservacion({
        id: "res-op-swap2",
        solicitudId: "sol-op-swap2",
        vehiculoId: "veh-1",
        fechaInicio: new Date(ahora.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        fechaFin: new Date(ahora.getTime() + 6 * 60 * 60 * 1000).toISOString(),
        estadoReservacion: "ASIGNADA",
      })
    );

    const estadoVeh1Antes = (await db.vehiculos.get("veh-1"))?.estadoOperativo;
    const estadoVeh8Antes = (await db.vehiculos.get("veh-8"))?.estadoOperativo;

    const resultado = await reasignarVehiculoOperacion({
      solicitudId: "sol-op-swap2",
      vehiculoNuevoId: "veh-8",
      justificacion: "Cambio de unidad antes de la salida",
      usuarioId: ADMIN_ID,
    });
    if (esResultadoSinDatos(resultado)) {
      throw new Error(`se esperaba una reasignación exitosa: ${resultado.detalle}`);
    }
    expect(resultado.reservacion.vehiculoId).toBe("veh-8");

    expect((await db.vehiculos.get("veh-1"))?.estadoOperativo).toBe(estadoVeh1Antes);
    expect((await db.vehiculos.get("veh-8"))?.estadoOperativo).toBe(estadoVeh8Antes);
  });

  it("exige justificación para reasignar (delegado a reasignarManualmente del Chunk 5)", async () => {
    await db.solicitudes.add(
      crearSolicitud({ id: "sol-op-sinjust", fechaSolicitud: fechaLocalISO(new Date()), estadoSolicitud: "ASIGNADA" })
    );
    await db.reservaciones.add(
      crearReservacion({
        id: "res-op-sinjust",
        solicitudId: "sol-op-sinjust",
        vehiculoId: "veh-1",
        fechaInicio: new Date().toISOString(),
        fechaFin: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        estadoReservacion: "ASIGNADA",
      })
    );

    const resultado = await reasignarVehiculoOperacion({
      solicitudId: "sol-op-sinjust",
      vehiculoNuevoId: "veh-8",
      justificacion: "   ",
      usuarioId: ADMIN_ID,
    });
    expect(esResultadoSinDatos(resultado)).toBe(true);
  });
});
