/**
 * Prueba de integración del flujo completo: Colaborador crea una solicitud
 * que requiere aprobación especial (Chunk 6) -> el Aprobador la ve y decide
 * en /aprobaciones (este chunk) -> el estado se refleja correctamente de
 * vuelta en Mis reservaciones del colaborador (Chunk 7). Usa fake-indexeddb
 * para ejercitar los adaptadores reales sobre Dexie, igual que
 * servicioAsignacion.test.ts.
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import { crearSolicitudDesdeWizard, type DatosViajeValidados } from "@/lib/adapters/solicitudes";
import { evaluarAlternativasParaSolicitud } from "@/lib/adapters/flota";
import { listarSolicitudesDeUsuario, obtenerDetalleSolicitud } from "@/lib/adapters/reservaciones";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { esResultadoSinDatos } from "@/lib/services/types";
import { decidirSolicitud, listarSolicitudesPendientes } from "./aprobaciones";

const COLABORADOR_ID = "user-1"; // territorio-cdmx
const APROBADOR_ID = "user-2"; // territorio-cdmx

/** Solicitud de fin de semana: siempre dispara aprobación especial, sin depender del costo calculado. */
async function crearSolicitudQueRequiereAprobacion() {
  const datos: DatosViajeValidados = {
    territorio: "territorio-cdmx",
    origen: "Torre Banorte",
    destino: "Aeropuerto CDMX",
    fechaSalida: "2026-08-08", // sábado
    horaSalida: "10:00",
    fechaRegreso: "2026-08-08",
    horaRegreso: "14:00",
    distanciaEstimadaKm: 20,
    pasajeros: 2,
    motivoViaje: "Prueba de flujo completo de aprobación",
    tipoVehiculoRequerido: "sedan-compacto",
    transportaEquipo: false,
  };

  const fechaSalida = new Date(`${datos.fechaSalida}T${datos.horaSalida}:00`);
  const fechaRegreso = new Date(`${datos.fechaRegreso}T${datos.horaRegreso}:00`);
  const duracionEstimadaMinutos = 45;

  const evaluacion = await evaluarAlternativasParaSolicitud(
    {
      territorio: datos.territorio,
      distanciaEstimadaKm: datos.distanciaEstimadaKm,
      duracionEstimadaMinutos,
      fechaSalida,
      fechaRegreso,
      pasajeros: datos.pasajeros,
      tipoVehiculoRequerido: datos.tipoVehiculoRequerido,
    },
    PARAMS_CONFIG.limitesCostoEspecial.colaborador
  );

  if (esResultadoSinDatos(evaluacion.resultado)) {
    throw new Error(`No se pudo evaluar la solicitud de prueba: ${evaluacion.resultado.detalle}`);
  }
  expect(evaluacion.resultado.requiereAprobacionEspecial).toBe(true);

  return crearSolicitudDesdeWizard({
    datos,
    fechaSalida,
    fechaRegreso,
    duracionEstimadaMinutos,
    alternativaSeleccionada: evaluacion.resultado.recomendada,
    resultado: evaluacion.resultado,
    usuarioSolicitanteId: COLABORADOR_ID,
    limiteCostoAprobacion: PARAMS_CONFIG.limitesCostoEspecial.colaborador,
  });
}

describe("flujo completo: Colaborador crea -> Aprobador decide -> Mis reservaciones refleja el estado", () => {
  beforeEach(async () => {
    await initializeDemoData();
  });

  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it("lista la solicitud en /aprobaciones con la comparación reutilizada de servicioComparador", async () => {
    const envio = await crearSolicitudQueRequiereAprobacion();
    expect(envio.estado).toBe("PENDIENTE_APROBACION");

    const pendientes = await listarSolicitudesPendientes("territorio-cdmx");
    const pendiente = pendientes.find((p) => p.solicitud.id === envio.solicitudId);

    expect(pendiente).toBeDefined();
    expect(pendiente!.solicitud.requiereAprobacionEspecial).toBe(true);
    expect(pendiente!.resultado).not.toBeNull();
    expect(pendiente!.resultado!.alternativas.map((a) => a.tipo).sort()).toEqual(["ASIGNADO", "POOL", "UBER"]);
    expect(pendiente!.medioRecomendado).toBe(pendiente!.resultado!.recomendada);
  });

  it("Aprobar asigna vehículo (o aprueba con Uber) y refleja el estado en Mis reservaciones", async () => {
    const envio = await crearSolicitudQueRequiereAprobacion();

    const decision = await decidirSolicitud({
      solicitudId: envio.solicitudId,
      aprobadorId: APROBADOR_ID,
      decision: "APROBAR",
      comentario: "",
    });
    if (esResultadoSinDatos(decision)) {
      throw new Error(`se esperaba una decisión exitosa: ${decision.detalle}`);
    }
    expect(["ASIGNADA", "APROBADA"]).toContain(decision.solicitud.estadoSolicitud);

    const pendientesDespues = await listarSolicitudesPendientes("territorio-cdmx");
    expect(pendientesDespues.some((p) => p.solicitud.id === envio.solicitudId)).toBe(false);

    const misReservaciones = await listarSolicitudesDeUsuario(COLABORADOR_ID);
    const item = misReservaciones.find((r) => r.solicitud.id === envio.solicitudId);
    expect(item).toBeDefined();
    expect(item!.solicitud.estadoSolicitud).toBe(decision.solicitud.estadoSolicitud);
    if (decision.solicitud.estadoSolicitud === "ASIGNADA") {
      expect(item!.reservacion).not.toBeNull();
      expect(item!.vehiculoNombre).toBeTruthy();
    }

    const auditorias = await db.registrosAuditoria.where("entidadId").equals(envio.solicitudId).toArray();
    expect(auditorias.some((a) => a.accion === "APROBACION" && a.usuarioId === APROBADOR_ID)).toBe(true);

    const aprobacion = await db.aprobaciones.where("solicitudId").equals(envio.solicitudId).first();
    expect(aprobacion?.decision).toBe("APROBADA");
  });

  it("Rechazar deja el comentario visible para el colaborador en Mis reservaciones", async () => {
    const envio = await crearSolicitudQueRequiereAprobacion();

    const decision = await decidirSolicitud({
      solicitudId: envio.solicitudId,
      aprobadorId: APROBADOR_ID,
      decision: "RECHAZAR",
      comentario: "No se justifica el gasto para este trayecto.",
    });
    if (esResultadoSinDatos(decision)) {
      throw new Error(`se esperaba una decisión exitosa: ${decision.detalle}`);
    }
    expect(decision.solicitud.estadoSolicitud).toBe("RECHAZADA");

    const misReservaciones = await listarSolicitudesDeUsuario(COLABORADOR_ID);
    const item = misReservaciones.find((r) => r.solicitud.id === envio.solicitudId);
    expect(item?.solicitud.estadoSolicitud).toBe("RECHAZADA");

    const detalle = await obtenerDetalleSolicitud(envio.solicitudId);
    const rechazo = detalle?.historial.find((h) => h.titulo === "Solicitud rechazada");
    expect(rechazo?.detalle).toBe("No se justifica el gasto para este trayecto.");

    const auditorias = await db.registrosAuditoria.where("entidadId").equals(envio.solicitudId).toArray();
    expect(auditorias.some((a) => a.accion === "RECHAZO")).toBe(true);
  });

  it("Solicitar cambios regresa la solicitud a Borrador y notifica (simulado) al colaborador", async () => {
    const envio = await crearSolicitudQueRequiereAprobacion();

    const decision = await decidirSolicitud({
      solicitudId: envio.solicitudId,
      aprobadorId: APROBADOR_ID,
      decision: "SOLICITAR_CAMBIOS",
      comentario: "Ajusta el horario para que quede dentro de la jornada laboral.",
    });
    if (esResultadoSinDatos(decision)) {
      throw new Error(`se esperaba una decisión exitosa: ${decision.detalle}`);
    }
    expect(decision.solicitud.estadoSolicitud).toBe("BORRADOR");

    const misReservaciones = await listarSolicitudesDeUsuario(COLABORADOR_ID);
    expect(misReservaciones.find((r) => r.solicitud.id === envio.solicitudId)?.solicitud.estadoSolicitud).toBe("BORRADOR");

    const notificaciones = await db.notificaciones.where("solicitudId").equals(envio.solicitudId).toArray();
    expect(notificaciones).toHaveLength(1);
    expect(notificaciones[0].usuarioDestinoId).toBe(COLABORADOR_ID);
    expect(notificaciones[0].mensaje).toContain("jornada laboral");

    const auditorias = await db.registrosAuditoria.where("entidadId").equals(envio.solicitudId).toArray();
    expect(auditorias.some((a) => a.accion === "SOLICITUD_CAMBIOS")).toBe(true);
  });

  it("exige comentario para Rechazar y Solicitar cambios, pero no para Aprobar", async () => {
    const envio = await crearSolicitudQueRequiereAprobacion();

    const rechazoSinComentario = await decidirSolicitud({
      solicitudId: envio.solicitudId,
      aprobadorId: APROBADOR_ID,
      decision: "RECHAZAR",
      comentario: "   ",
    });
    expect(esResultadoSinDatos(rechazoSinComentario)).toBe(true);

    const cambiosSinComentario = await decidirSolicitud({
      solicitudId: envio.solicitudId,
      aprobadorId: APROBADOR_ID,
      decision: "SOLICITAR_CAMBIOS",
      comentario: "",
    });
    expect(esResultadoSinDatos(cambiosSinComentario)).toBe(true);

    // La solicitud sigue pendiente: ninguno de los rechazos anteriores tuvo efecto.
    const pendientes = await listarSolicitudesPendientes("territorio-cdmx");
    expect(pendientes.some((p) => p.solicitud.id === envio.solicitudId)).toBe(true);
  });
});
