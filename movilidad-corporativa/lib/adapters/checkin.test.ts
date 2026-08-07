/**
 * Prueba de integración del check-in digital sobre el adaptador real (Dexie
 * vía fake-indexeddb, mismo patrón que servicioAsignacion.test.ts y
 * aprobaciones.test.ts): una reservación en "Vehículo asignado" debe poder
 * hacer check-in y pasar a "En curso", reflejándose en Mis reservaciones
 * (Chunk 7).
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import { listarSolicitudesDeUsuario } from "@/lib/adapters/reservaciones";
import { esResultadoSinDatos } from "@/lib/services/types";
import type { Reservacion, Solicitud } from "@/lib/models";
import { obtenerContextoCheckIn, registrarCheckIn, type RegistrarCheckInInput } from "./checkin";

const COLABORADOR_ID = "user-1"; // territorio-cdmx
const VEHICULO_ID = "veh-1"; // Toyota Corolla, POOL, territorio-cdmx, kilometrajeActual 18250

async function crearReservacionAsignada(overrides: Partial<Solicitud & Reservacion> = {}): Promise<{ solicitud: Solicitud; reservacion: Reservacion }> {
  const ahora = new Date();
  const fechaInicio = new Date(ahora.getTime() + 2 * 60 * 60 * 1000); // en 2 horas: dentro de la ventana de check-in
  const fechaFin = new Date(ahora.getTime() + 6 * 60 * 60 * 1000);

  const solicitud: Solicitud = {
    id: "sol-checkin-test",
    fechaCreacion: ahora.toISOString(),
    fechaActualizacion: ahora.toISOString(),
    usuarioCreadorId: COLABORADOR_ID,
    estatus: "ACTIVO",
    folio: "MOV-2026-000900",
    usuarioSolicitanteId: COLABORADOR_ID,
    territorioId: "territorio-cdmx",
    fechaSolicitud: fechaInicio.toISOString().slice(0, 10),
    horaInicioDeseada: "09:00",
    horaFinDeseada: "13:00",
    origen: "Torre Banorte",
    destino: "Sucursal Reforma",
    distanciaEstimadaKm: 10,
    pasajeros: 1,
    motivoViaje: "Prueba de check-in",
    tipoViaje: "Corporativo",
    modalidadRequerida: "POOL",
    costoEstimado: 200,
    estadoSolicitud: "ASIGNADA",
    prioridad: "MEDIA",
    ...overrides,
  };

  const reservacion: Reservacion = {
    id: "res-checkin-test",
    fechaCreacion: ahora.toISOString(),
    fechaActualizacion: ahora.toISOString(),
    usuarioCreadorId: COLABORADOR_ID,
    estatus: "ACTIVO",
    solicitudId: solicitud.id,
    vehiculoId: VEHICULO_ID,
    modalidadAsignada: "POOL",
    fechaInicio: fechaInicio.toISOString(),
    fechaFin: fechaFin.toISOString(),
    costoEstimado: 200,
    costoReal: 0,
    estadoReservacion: "ASIGNADA",
    ...overrides,
  };

  await db.solicitudes.add(solicitud);
  await db.reservaciones.add(reservacion);
  return { solicitud, reservacion };
}

function inputValido(reservacionId: string, overrides: Partial<RegistrarCheckInInput> = {}): RegistrarCheckInInput {
  return {
    reservacionId,
    usuarioId: COLABORADOR_ID,
    ubicacion: "Torre Banorte",
    kilometrajeInicial: 18250,
    combustibleInicial: 80,
    fotos: ["data:image/png;base64,foto1"],
    firmaElectronica: "data:image/png;base64,firma",
    responsivaAceptada: true,
    ...overrides,
  };
}

describe("check-in digital", () => {
  beforeEach(async () => {
    await initializeDemoData();
  });

  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it("una reservación 'Vehículo asignado' con fecha vigente permite armar el contexto de check-in", async () => {
    const { reservacion, solicitud } = await crearReservacionAsignada();

    const contexto = await obtenerContextoCheckIn(reservacion.id);
    if (esResultadoSinDatos(contexto)) {
      throw new Error(`se esperaba un contexto válido: ${contexto.detalle}`);
    }
    expect(contexto.solicitud.id).toBe(solicitud.id);
    expect(contexto.vehiculo.id).toBe(VEHICULO_ID);
    expect(contexto.vehiculo.placa).toBe("ABC-123");
  });

  it("bloquea con un mensaje claro cuando la reservación no tiene asignación de vehículo (no existe)", async () => {
    const contexto = await obtenerContextoCheckIn("reservacion-inexistente");
    expect(esResultadoSinDatos(contexto)).toBe(true);
    if (esResultadoSinDatos(contexto)) {
      expect(contexto.detalle).toContain("asignación de vehículo confirmada");
    }
  });

  it("bloquea el check-in si la solicitud no está en un estado permitido", async () => {
    const { reservacion } = await crearReservacionAsignada({ estadoSolicitud: "PENDIENTE_APROBACION" } as Partial<Solicitud>);

    const contexto = await obtenerContextoCheckIn(reservacion.id);
    expect(esResultadoSinDatos(contexto)).toBe(true);
    if (esResultadoSinDatos(contexto)) {
      expect(contexto.detalle).toContain("Vehículo asignado");
    }
  });

  it("bloquea el check-in si la fecha de salida todavía no es vigente", async () => {
    const ahora = new Date();
    const fechaLejana = new Date(ahora.getTime() + 72 * 60 * 60 * 1000);
    const { reservacion } = await crearReservacionAsignada({
      fechaInicio: fechaLejana.toISOString(),
      fechaFin: new Date(fechaLejana.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    } as Partial<Reservacion>);

    const contexto = await obtenerContextoCheckIn(reservacion.id);
    expect(esResultadoSinDatos(contexto)).toBe(true);
    if (esResultadoSinDatos(contexto)) {
      expect(contexto.detalle).toContain("aún no está disponible");
    }
  });

  it("rechaza el check-in cuando faltan datos obligatorios y no cambia el estado", async () => {
    const { reservacion } = await crearReservacionAsignada();

    const resultado = await registrarCheckIn(
      inputValido(reservacion.id, { fotos: [], responsivaAceptada: false, firmaElectronica: "" })
    );
    expect(esResultadoSinDatos(resultado)).toBe(true);

    const reservacionSinCambios = await db.reservaciones.get(reservacion.id);
    expect(reservacionSinCambios?.estadoReservacion).toBe("ASIGNADA");
  });

  it("rechaza un kilometraje inicial menor al último registrado del vehículo", async () => {
    const { reservacion } = await crearReservacionAsignada();
    const resultado = await registrarCheckIn(inputValido(reservacion.id, { kilometrajeInicial: 1000 }));
    expect(esResultadoSinDatos(resultado)).toBe(true);
    if (esResultadoSinDatos(resultado)) {
      expect(resultado.detalle).toContain("no puede ser menor");
    }
  });

  it("confirma el check-in: crea el CheckIn, pasa a 'En curso' y se refleja en Mis reservaciones", async () => {
    const { reservacion, solicitud } = await crearReservacionAsignada();

    const resultado = await registrarCheckIn(inputValido(reservacion.id));
    if (esResultadoSinDatos(resultado)) {
      throw new Error(`se esperaba un check-in exitoso: ${resultado.detalle}`);
    }

    expect(resultado.reservacionId).toBe(reservacion.id);
    expect(resultado.kilometrajeInicial).toBe(18250);
    expect(resultado.combustibleInicial).toBe(80);
    expect(resultado.fotos).toHaveLength(1);
    expect(resultado.firmaElectronica).toBeTruthy();
    expect(resultado.responsivaAceptada).toBe(true);

    const reservacionActualizada = await db.reservaciones.get(reservacion.id);
    expect(reservacionActualizada?.estadoReservacion).toBe("EN_CURSO");

    const solicitudActualizada = await db.solicitudes.get(solicitud.id);
    expect(solicitudActualizada?.estadoSolicitud).toBe("EN_CURSO");

    const vehiculoActualizado = await db.vehiculos.get(VEHICULO_ID);
    expect(vehiculoActualizado?.estadoOperativo).toBe("OCUPADO");
    expect(vehiculoActualizado?.disponibilidadActual).toBe(false);

    const auditorias = await db.registrosAuditoria.where("entidadId").equals(reservacion.id).toArray();
    expect(auditorias.some((a) => a.accion === "CHECK_IN" && a.usuarioId === COLABORADOR_ID)).toBe(true);

    // Chunk 7: Mis reservaciones debe reflejar el nuevo estado del colaborador.
    const misReservaciones = await listarSolicitudesDeUsuario(COLABORADOR_ID);
    const item = misReservaciones.find((r) => r.solicitud.id === solicitud.id);
    expect(item?.solicitud.estadoSolicitud).toBe("EN_CURSO");
    expect(item?.reservacion?.estadoReservacion).toBe("EN_CURSO");

    // Ya no debe ser posible otro check-in sobre la misma reservación.
    const segundoIntento = await obtenerContextoCheckIn(reservacion.id);
    expect(esResultadoSinDatos(segundoIntento)).toBe(true);
  });
});
