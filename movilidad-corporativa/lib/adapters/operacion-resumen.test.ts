/**
 * Pruebas de integración de la pestaña "Resumen" de /operacion
 * (obtenerResumenOperativo), sobre el adaptador real (Dexie vía
 * fake-indexeddb, mismo patrón que operacion.test.ts). Cubre las 8 secciones
 * del dashboard operativo en vivo.
 *
 * Importante: varias fechas del seed base (lib/seed/demo-data.ts) están
 * ancladas a 2026-08-07/08-20/08-25 y pueden entrar o salir de ventanas
 * relativas a "ahora" (p. ej. "próximas 24h") según el momento real en que
 * corran las pruebas. Por eso las aserciones dependientes del tiempo usan
 * `.some()`/`.find()` sobre los registros añadidos por cada prueba, nunca
 * conteos exactos derivados únicamente del seed base.
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import type { Aprobacion, CheckIn, CheckOut, Incidencia, Mantenimiento, Reservacion, Solicitud } from "@/lib/models";
import { fechaLocalISO, obtenerResumenOperativo } from "./operacion";

const ADMIN_ID = "user-admin";

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
    motivoViaje: "Prueba de resumen operativo",
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

beforeEach(async () => {
  await initializeDemoData();
});

afterEach(async () => {
  vi.useRealTimers();
  await db.delete();
  await db.open();
});

describe("obtenerResumenOperativo", () => {
  it("1. calcula disponibilidad por territorio x modalidad, sin mezclar Uber", async () => {
    const resumen = await obtenerResumenOperativo();
    expect(resumen.disponibilidad.length).toBeGreaterThan(0);
    for (const celda of resumen.disponibilidad) {
      expect(["POOL", "ASIGNADO"]).toContain(celda.modalidad);
      expect(celda.disponibles).toBeLessThanOrEqual(celda.total);
    }
    const cdmxPool = resumen.disponibilidad.find((c) => c.territorioId === "territorio-cdmx" && c.modalidad === "POOL");
    expect(cdmxPool).toBeDefined();
  });

  it("2. marca un territorio como saturado cuando hay más solicitudes en espera que vehículos Pool disponibles", async () => {
    // territorio-merida tiene 1 vehículo Pool (veh-6); lo bloqueamos y agregamos 2 solicitudes en espera.
    await db.vehiculos.update("veh-6", { disponibilidadActual: false, estadoOperativo: "OCUPADO" });
    await db.solicitudes.add(crearSolicitud({ id: "sol-sat-1", fechaSolicitud: fechaLocalISO(new Date()), estadoSolicitud: "PENDIENTE_APROBACION", territorioId: "territorio-merida" }));
    await db.solicitudes.add(crearSolicitud({ id: "sol-sat-2", fechaSolicitud: fechaLocalISO(new Date()), estadoSolicitud: "APROBADA", territorioId: "territorio-merida" }));

    const resumen = await obtenerResumenOperativo();
    const merida = resumen.saturacion.find((s) => s.territorioId === "territorio-merida");
    expect(merida).toBeDefined();
    expect(merida?.vehiculosPoolDisponibles).toBe(0);
    expect(merida?.solicitudesEnEspera).toBeGreaterThanOrEqual(2);
    expect(merida?.saturado).toBe(true);
  });

  it("3. incluye reservaciones cuyo inicio cae dentro de las próximas 24 horas", async () => {
    const en3h = new Date(Date.now() + 3 * 60 * 60 * 1000);
    await db.solicitudes.add(crearSolicitud({ id: "sol-prox24h", fechaSolicitud: fechaLocalISO(en3h), estadoSolicitud: "ASIGNADA" }));
    await db.reservaciones.add(
      crearReservacion({
        id: "res-prox24h",
        solicitudId: "sol-prox24h",
        vehiculoId: "veh-8",
        fechaInicio: en3h.toISOString(),
        fechaFin: new Date(en3h.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        estadoReservacion: "ASIGNADA",
      })
    );

    const resumen = await obtenerResumenOperativo();
    const encontrada = resumen.reservacionesProximas24h.find((r) => r.reservacion.id === "res-prox24h");
    expect(encontrada).toBeDefined();
    expect(encontrada?.minutosParaInicio).toBeGreaterThan(0);
    expect(encontrada?.minutosParaInicio).toBeLessThanOrEqual(24 * 60);

    // Una reservación a 30 horas no debe aparecer.
    const en30h = new Date(Date.now() + 30 * 60 * 60 * 1000);
    await db.solicitudes.add(crearSolicitud({ id: "sol-lejos", fechaSolicitud: fechaLocalISO(en30h), estadoSolicitud: "ASIGNADA" }));
    await db.reservaciones.add(
      crearReservacion({
        id: "res-lejos",
        solicitudId: "sol-lejos",
        vehiculoId: "veh-1",
        fechaInicio: en30h.toISOString(),
        fechaFin: new Date(en30h.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        estadoReservacion: "ASIGNADA",
      })
    );
    const resumen2 = await obtenerResumenOperativo();
    expect(resumen2.reservacionesProximas24h.some((r) => r.reservacion.id === "res-lejos")).toBe(false);
  });

  it("4. reutiliza los retrasos en vivo del panel del día (checkout vencido)", async () => {
    const hace2h = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await db.solicitudes.add(crearSolicitud({ id: "sol-resumen-retraso", fechaSolicitud: fechaLocalISO(new Date()), estadoSolicitud: "EN_CURSO" }));
    await db.reservaciones.add(
      crearReservacion({
        id: "res-resumen-retraso",
        solicitudId: "sol-resumen-retraso",
        vehiculoId: "veh-6",
        fechaInicio: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        fechaFin: hace2h.toISOString(),
        estadoReservacion: "EN_CURSO",
      })
    );

    const resumen = await obtenerResumenOperativo();
    expect(resumen.devolucionesRetrasadas.some((f) => f.solicitud.id === "sol-resumen-retraso")).toBe(true);
  });

  it("5. lista mantenimientos próximos (no realizados) ordenados por días restantes", async () => {
    const mant: Mantenimiento = {
      id: "mant-prox-test",
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      usuarioCreadorId: ADMIN_ID,
      estatus: "ACTIVO",
      vehiculoId: "veh-1",
      tipoMantenimiento: "CAMBIO_ACEITE",
      fechaProgramada: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      costo: 1200,
      responsable: "Taller Banorte",
    };
    await db.mantenimientos.add(mant);

    const resumen = await obtenerResumenOperativo();
    const encontrado = resumen.mantenimientosProximos.find((m) => m.mantenimiento.id === "mant-prox-test");
    expect(encontrado).toBeDefined();
    expect(encontrado?.diasRestantes).toBeGreaterThanOrEqual(4);
    expect(encontrado?.diasRestantes).toBeLessThanOrEqual(5);
    expect(resumen.umbralMantenimientoDiasPorDefecto).toBeGreaterThan(0);

    // mant-1 del seed ya fue realizado; nunca debe aparecer como "próximo".
    expect(resumen.mantenimientosProximos.some((m) => m.mantenimiento.id === "mant-1")).toBe(false);
  });

  it("6. resalta solicitudes aprobadas sin vehículo asignado todavía", async () => {
    await db.solicitudes.add(crearSolicitud({ id: "sol-sin-asignar", fechaSolicitud: fechaLocalISO(new Date()), estadoSolicitud: "APROBADA" }));

    const resumen = await obtenerResumenOperativo();
    const encontrada = resumen.solicitudesSinAsignar.find((s) => s.solicitud.id === "sol-sin-asignar");
    expect(encontrada).toBeDefined();
    expect(encontrada?.horasEnEspera).toBeGreaterThanOrEqual(0);

    // sol-2 del seed está ASIGNADA (ya tiene reservación res-2) y no debe aparecer.
    expect(resumen.solicitudesSinAsignar.some((s) => s.solicitud.id === "sol-2")).toBe(false);
  });

  it("7. calcula tiempos promedio de aprobación, entrega y recepción a partir de registros reales", async () => {
    const t0 = new Date("2026-01-10T08:00:00-06:00");
    const t1 = new Date("2026-01-10T09:30:00-06:00"); // +90 min: aprobación
    const t2 = new Date("2026-01-10T10:00:00-06:00"); // +30 min desde reservación: check-in
    const t3 = new Date("2026-01-10T14:00:00-06:00"); // regreso planeado 13:45, checkout real 14:00: +15 min

    await db.solicitudes.add(
      crearSolicitud({ id: "sol-tiempos", fechaSolicitud: "2026-01-10", estadoSolicitud: "COMPLETADA", fechaCreacion: t0.toISOString() })
    );
    const aprobacion: Aprobacion = {
      id: "apr-tiempos",
      fechaCreacion: t1.toISOString(),
      fechaActualizacion: t1.toISOString(),
      usuarioCreadorId: ADMIN_ID,
      estatus: "ACTIVO",
      solicitudId: "sol-tiempos",
      aprobadorId: ADMIN_ID,
      decision: "APROBADA",
      reglaAplicada: "Prueba",
      fechaDecision: t1.toISOString(),
    };
    await db.aprobaciones.add(aprobacion);

    await db.reservaciones.add(
      crearReservacion({
        id: "res-tiempos",
        solicitudId: "sol-tiempos",
        vehiculoId: "veh-1",
        fechaInicio: t2.toISOString(),
        fechaFin: new Date("2026-01-10T13:45:00-06:00").toISOString(),
        estadoReservacion: "COMPLETADA",
        fechaCreacion: t1.toISOString(),
      })
    );

    const checkIn: CheckIn = {
      id: "checkin-tiempos",
      fechaCreacion: t2.toISOString(),
      fechaActualizacion: t2.toISOString(),
      usuarioCreadorId: "user-1",
      estatus: "ACTIVO",
      reservacionId: "res-tiempos",
      usuarioId: "user-1",
      fechaHoraCheckIn: t2.toISOString(),
      ubicacion: "Depósito CDMX",
      kilometrajeInicial: 1000,
      combustibleInicial: 90,
      fotos: [],
      firmaElectronica: "data:image/png;base64,",
      responsivaAceptada: true,
    };
    await db.checkIns.add(checkIn);

    const checkOut: CheckOut = {
      id: "checkout-tiempos",
      fechaCreacion: t3.toISOString(),
      fechaActualizacion: t3.toISOString(),
      usuarioCreadorId: "user-1",
      estatus: "ACTIVO",
      reservacionId: "res-tiempos",
      usuarioId: "user-1",
      fechaHoraCheckOut: t3.toISOString(),
      kilometrajeFinal: 1050,
      combustibleRestante: 70,
      fotos: [],
      estadoVehiculo: "BUENO",
      llavesDevueltas: true,
      kilometrosRecorridos: 50,
      duracionRealMinutos: 240,
      retrasoMinutos: 15,
      diferenciaCombustiblePorcentaje: 5,
      fueraDeHorarioNoAutorizado: false,
      costoReal: 300,
      emisionesRealesGramos: 4000,
      incidenciasCreadasIds: [],
    };
    await db.checkOuts.add(checkOut);

    const resumen = await obtenerResumenOperativo();
    expect(resumen.tiempos.aprobacionMinutos).not.toBeNull();
    expect(resumen.tiempos.entregaMinutos).not.toBeNull();
    expect(resumen.tiempos.recepcionMinutos).not.toBeNull();
    // No podemos aislar exactamente esta única muestra (el seed base también aporta pares),
    // pero el promedio debe seguir siendo un número finito y razonable.
    expect(Number.isFinite(resumen.tiempos.aprobacionMinutos)).toBe(true);
    expect(Number.isFinite(resumen.tiempos.entregaMinutos)).toBe(true);
    expect(Number.isFinite(resumen.tiempos.recepcionMinutos)).toBe(true);
  });

  it("7b. 'Sin datos suficientes': con una base de datos sin aprobaciones/check-ins/check-outs, los promedios son null", async () => {
    await db.delete();
    await db.open();
    // Sembramos usuarios/vehículos/territorios mínimos sin historial de aprobaciones/checkin/checkout.
    await initializeDemoData();
    await db.aprobaciones.clear();
    await db.checkIns.clear();
    await db.checkOuts.clear();

    const resumen = await obtenerResumenOperativo();
    expect(resumen.tiempos.aprobacionMinutos).toBeNull();
    expect(resumen.tiempos.entregaMinutos).toBeNull();
    expect(resumen.tiempos.recepcionMinutos).toBeNull();
  });

  it("8. detecta incidencias críticas abiertas como alerta", async () => {
    const incidenciaCritica: Incidencia = {
      id: "inc-critica-test",
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      usuarioCreadorId: ADMIN_ID,
      estatus: "ACTIVO",
      vehiculoId: "veh-1",
      usuarioReportaId: "user-1",
      tipoIncidencia: "ACCIDENTE",
      severidad: "CRITICA",
      descripcion: "Accidente de prueba",
      fotos: [],
      bitacora: [],
      estadoIncidencia: "ABIERTA",
    };
    await db.incidencias.add(incidenciaCritica);

    const resumen = await obtenerResumenOperativo();
    expect(resumen.alertas.incidenciasCriticas.some((i) => i.incidencia.id === "inc-critica-test")).toBe(true);
  });

  it("8b. detecta vehículos fuera de horario en este momento cuando 'ahora' cae fuera del horario laboral", async () => {
    // Sábado (fuera de horario laboral y de fin de semana) a mediodía.
    const sabadoFueraDeHorario = new Date(2026, 7, 8, 12, 0, 0); // 2026-08-08 es sábado
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(sabadoFueraDeHorario);

    await db.solicitudes.add(crearSolicitud({ id: "sol-fuera-horario", fechaSolicitud: fechaLocalISO(sabadoFueraDeHorario), estadoSolicitud: "EN_CURSO" }));
    await db.reservaciones.add(
      crearReservacion({
        id: "res-fuera-horario",
        solicitudId: "sol-fuera-horario",
        vehiculoId: "veh-1",
        fechaInicio: new Date(sabadoFueraDeHorario.getTime() - 60 * 60 * 1000).toISOString(),
        fechaFin: new Date(sabadoFueraDeHorario.getTime() + 60 * 60 * 1000).toISOString(),
        estadoReservacion: "EN_CURSO",
      })
    );

    const resumen = await obtenerResumenOperativo();
    expect(resumen.alertas.esFueraDeHorarioAhora).toBe(true);
    expect(resumen.alertas.vehiculosFueraDeHorarioAhora.some((v) => v.vehiculo.id === "veh-1")).toBe(true);
  });
});
