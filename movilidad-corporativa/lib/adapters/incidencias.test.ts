/**
 * Pruebas de /incidencias sobre el adaptador real (Dexie vía
 * fake-indexeddb, mismo patrón que el resto de los adaptadores). Incluye la
 * verificación explícita de que las incidencias automáticas del check-out
 * (Chunk 10/11) aparecen aquí correctamente vinculadas a su folio de
 * origen, y de que la tasa "incidencias por cada 100 viajes" (Chunk 15) se
 * calcula correctamente a partir de los datos reales.
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import { registrarCheckOut } from "@/lib/adapters/checkout";
import { esResultadoSinDatos } from "@/lib/services/types";
import type { Reservacion, Solicitud } from "@/lib/models";
import {
  agregarComentarioBitacora,
  asignarResponsable,
  cambiarEstadoIncidencia,
  crearIncidenciaManual,
  listarIncidencias,
  listarIncidenciasCriticasAbiertas,
  obtenerDetalleIncidencia,
  obtenerTasaIncidenciasPorCadaCienViajes,
  type DatosIncidenciaManual,
} from "./incidencias";

const ADMIN_ID = "user-admin";
const COLABORADOR_ID = "user-1"; // territorio-cdmx

function datosManualValidos(overrides: Partial<DatosIncidenciaManual> = {}): DatosIncidenciaManual {
  return {
    tipoIncidencia: "DOCUMENTACION_VENCIDA",
    severidad: "MEDIA",
    vehiculoId: "veh-1",
    descripcion: "La tarjeta de circulación venció la semana pasada.",
    fotos: [],
    ...overrides,
  };
}

async function crearReservacionEnCurso(): Promise<{ solicitud: Solicitud; reservacion: Reservacion }> {
  const ahora = new Date();
  const fechaInicio = new Date(ahora.getTime() - 60 * 60 * 1000);
  const fechaFin = new Date(ahora.getTime() + 3 * 60 * 60 * 1000);

  const solicitud: Solicitud = {
    id: "sol-inc-test",
    fechaCreacion: ahora.toISOString(),
    fechaActualizacion: ahora.toISOString(),
    usuarioCreadorId: COLABORADOR_ID,
    estatus: "ACTIVO",
    folio: "MOV-2026-000950",
    usuarioSolicitanteId: COLABORADOR_ID,
    territorioId: "territorio-cdmx",
    fechaSolicitud: fechaInicio.toISOString().slice(0, 10),
    horaInicioDeseada: "09:00",
    horaFinDeseada: "13:00",
    origen: "Torre Banorte",
    destino: "Sucursal Reforma",
    distanciaEstimadaKm: 10,
    pasajeros: 1,
    motivoViaje: "Prueba de incidencias",
    tipoViaje: "Corporativo",
    modalidadRequerida: "POOL",
    costoEstimado: 200,
    estadoSolicitud: "EN_CURSO",
    prioridad: "MEDIA",
  };

  const reservacion: Reservacion = {
    id: "res-inc-test",
    fechaCreacion: ahora.toISOString(),
    fechaActualizacion: ahora.toISOString(),
    usuarioCreadorId: COLABORADOR_ID,
    estatus: "ACTIVO",
    solicitudId: solicitud.id,
    vehiculoId: "veh-8",
    modalidadAsignada: "POOL",
    fechaInicio: fechaInicio.toISOString(),
    fechaFin: fechaFin.toISOString(),
    costoEstimado: 200,
    costoReal: 0,
    estadoReservacion: "EN_CURSO",
  };

  await db.solicitudes.add(solicitud);
  await db.reservaciones.add(reservacion);
  await db.checkIns.add({
    id: "checkin-inc-test",
    fechaCreacion: fechaInicio.toISOString(),
    fechaActualizacion: fechaInicio.toISOString(),
    usuarioCreadorId: COLABORADOR_ID,
    estatus: "ACTIVO",
    reservacionId: reservacion.id,
    usuarioId: COLABORADOR_ID,
    fechaHoraCheckIn: fechaInicio.toISOString(),
    ubicacion: "Torre Banorte",
    kilometrajeInicial: 9800,
    combustibleInicial: 80,
    fotos: ["data:image/png;base64,foto"],
    firmaElectronica: "data:image/png;base64,firma",
    responsivaAceptada: true,
  });

  return { solicitud, reservacion };
}

describe("/incidencias", () => {
  beforeEach(async () => {
    await initializeDemoData();
  });

  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it("lista las incidencias existentes enriquecidas con vehículo, folio y nombres", async () => {
    const items = await listarIncidencias();
    const inc1 = items.find((i) => i.incidencia.id === "inc-1");
    expect(inc1).toBeDefined();
    expect(inc1?.vehiculo?.id).toBe("veh-2");
    expect(inc1?.territorioNombre).toBe("Guadalajara");
    expect(inc1?.folioSolicitud).toBe("MOV-2025-000002");
    expect(inc1?.responsableNombre).toBe("María Torres");
    expect(inc1?.reportadoPorNombre).toBe("Diego Ortega");
  });

  it("crea una incidencia manual y la registra en auditoría", async () => {
    const resultado = await crearIncidenciaManual(datosManualValidos(), ADMIN_ID);
    if (esResultadoSinDatos(resultado)) throw new Error(`se esperaba éxito: ${resultado.detalle}`);
    expect(resultado.estadoIncidencia).toBe("ABIERTA");
    expect(resultado.bitacora).toHaveLength(1);

    const auditorias = await db.registrosAuditoria.where("entidadId").equals(resultado.id).toArray();
    expect(auditorias.some((a) => a.accion === "CREAR")).toBe(true);
  });

  it("rechaza crear una incidencia sin descripción o con un vehículo inválido", async () => {
    const sinDescripcion = await crearIncidenciaManual(datosManualValidos({ descripcion: "  " }), ADMIN_ID);
    expect(esResultadoSinDatos(sinDescripcion)).toBe(true);

    const vehiculoInvalido = await crearIncidenciaManual(datosManualValidos({ vehiculoId: "veh-no-existe" }), ADMIN_ID);
    expect(esResultadoSinDatos(vehiculoInvalido)).toBe(true);
  });

  it("agrega comentarios a la bitácora y exige contenido no vacío", async () => {
    const vacio = await agregarComentarioBitacora("inc-1", "   ", ADMIN_ID);
    expect(esResultadoSinDatos(vacio)).toBe(true);

    const resultado = await agregarComentarioBitacora("inc-1", "Se solicitó cotización al taller.", ADMIN_ID);
    if (esResultadoSinDatos(resultado)) throw new Error(`se esperaba éxito: ${resultado.detalle}`);
    expect(resultado.bitacora.some((b) => b.comentario === "Se solicitó cotización al taller.")).toBe(true);

    const detalle = await obtenerDetalleIncidencia("inc-1");
    expect(detalle?.bitacora.at(-1)?.comentario).toBe("Se solicitó cotización al taller.");
    expect(detalle?.bitacora.at(-1)?.usuarioNombre).toBe("María Torres");
  });

  it("asigna un responsable válido y dejarlo en bitácora", async () => {
    const resultado = await asignarResponsable("inc-1", "user-2", ADMIN_ID);
    if (esResultadoSinDatos(resultado)) throw new Error(`se esperaba éxito: ${resultado.detalle}`);
    expect(resultado.responsableId).toBe("user-2");

    const invalido = await asignarResponsable("inc-1", "usuario-no-existe", ADMIN_ID);
    expect(esResultadoSinDatos(invalido)).toBe(true);
  });

  it("exige comentario para marcar una incidencia como Resuelta o Cerrada, pero no para En proceso", async () => {
    const sinComentarioResuelta = await cambiarEstadoIncidencia("inc-1", "RESUELTA", ADMIN_ID, "");
    expect(esResultadoSinDatos(sinComentarioResuelta)).toBe(true);

    const enProceso = await cambiarEstadoIncidencia("inc-1", "EN_PROCESO", ADMIN_ID, "");
    if (esResultadoSinDatos(enProceso)) throw new Error(`se esperaba éxito: ${enProceso.detalle}`);
    expect(enProceso.estadoIncidencia).toBe("EN_PROCESO");

    const resuelta = await cambiarEstadoIncidencia("inc-1", "RESUELTA", ADMIN_ID, "Se cambiaron las balatas y se probó el sistema de frenos.");
    if (esResultadoSinDatos(resuelta)) throw new Error(`se esperaba éxito: ${resuelta.detalle}`);
    expect(resuelta.estadoIncidencia).toBe("RESUELTA");
    expect(resuelta.bitacora.at(-1)?.comentario).toContain("balatas");

    const auditorias = await db.registrosAuditoria.where("entidadId").equals("inc-1").toArray();
    expect(auditorias.some((a) => a.accion === "CAMBIO_ESTATUS")).toBe(true);
  });

  it("no permite 'cambiar' a un estatus que ya tiene", async () => {
    const resultado = await cambiarEstadoIncidencia("inc-1", "ABIERTA", ADMIN_ID, "");
    expect(esResultadoSinDatos(resultado)).toBe(true);
  });

  it("una incidencia Crítica abierta aparece en la alerta; deja de aparecer al resolverla", async () => {
    const critica = await crearIncidenciaManual(datosManualValidos({ severidad: "CRITICA", tipoIncidencia: "ACCIDENTE" }), ADMIN_ID);
    if (esResultadoSinDatos(critica)) throw new Error(`se esperaba éxito: ${critica.detalle}`);

    const antes = await listarIncidenciasCriticasAbiertas();
    expect(antes.some((i) => i.incidencia.id === critica.id)).toBe(true);

    await cambiarEstadoIncidencia(critica.id, "RESUELTA", ADMIN_ID, "Se atendió el accidente y se documentó el parte.");
    const despues = await listarIncidenciasCriticasAbiertas();
    expect(despues.some((i) => i.incidencia.id === critica.id)).toBe(false);
  });

  it("calcula la tasa de incidencias por cada 100 viajes a partir de los datos reales", async () => {
    // Seed: 1 incidencia (inc-1), 1 reservación Completada (res-1) -> 100 por cada 100 viajes.
    const inicial = await obtenerTasaIncidenciasPorCadaCienViajes();
    expect(inicial).toEqual({ totalIncidencias: 1, totalViajes: 1, tasaPorCadaCienViajes: 100 });

    // Agregamos 1 viaje completado más sin incidencias: baja a 50 por cada 100.
    await db.reservaciones.add({
      id: "res-inc-viaje-extra",
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      usuarioCreadorId: COLABORADOR_ID,
      estatus: "ACTIVO",
      solicitudId: "sol-1",
      vehiculoId: "veh-8",
      modalidadAsignada: "POOL",
      fechaInicio: new Date().toISOString(),
      fechaFin: new Date().toISOString(),
      costoEstimado: 100,
      costoReal: 100,
      estadoReservacion: "COMPLETADA",
    });
    const conDosViajes = await obtenerTasaIncidenciasPorCadaCienViajes();
    expect(conDosViajes).toEqual({ totalIncidencias: 1, totalViajes: 2, tasaPorCadaCienViajes: 50 });

    // Otra incidencia manual sube la tasa de nuevo.
    await crearIncidenciaManual(datosManualValidos(), ADMIN_ID);
    const conDosIncidencias = await obtenerTasaIncidenciasPorCadaCienViajes();
    expect(conDosIncidencias).toEqual({ totalIncidencias: 2, totalViajes: 2, tasaPorCadaCienViajes: 100 });
  });

  it("las incidencias automáticas de check-out (daños y fuera de horario) aparecen vinculadas a su folio de origen", async () => {
    const { solicitud, reservacion } = await crearReservacionEnCurso();

    const checkOut = await registrarCheckOut({
      reservacionId: reservacion.id,
      usuarioId: COLABORADOR_ID,
      kilometrajeFinal: 9850,
      combustibleRestante: 60,
      fotos: ["data:image/png;base64,checkout-foto"],
      estadoVehiculo: "CON_DANOS",
      llavesDevueltas: true,
      danosDescripcion: "Rayón profundo en la puerta izquierda",
    });
    if (esResultadoSinDatos(checkOut)) throw new Error(`se esperaba un check-out exitoso: ${checkOut.detalle}`);
    expect(checkOut.checkOut.incidenciasCreadasIds.length).toBeGreaterThanOrEqual(1);

    const items = await listarIncidencias();
    const incidenciaDanos = items.find((i) => i.incidencia.id === checkOut.checkOut.incidenciasCreadasIds[0]);
    expect(incidenciaDanos).toBeDefined();
    expect(incidenciaDanos?.incidencia.tipoIncidencia).toBe("DANOS");
    expect(incidenciaDanos?.folioSolicitud).toBe(solicitud.folio);
    expect(incidenciaDanos?.vehiculo?.id).toBe(reservacion.vehiculoId);
    expect(incidenciaDanos?.incidencia.bitacora[0]?.comentario).toContain(solicitud.folio);

    // Si además el uso fue fuera de horario/fin de semana no autorizado, esa incidencia también debe quedar ligada al mismo folio.
    if (checkOut.checkOut.incidenciasCreadasIds.length > 1) {
      const otra = items.find((i) => i.incidencia.id === checkOut.checkOut.incidenciasCreadasIds[1]);
      expect(otra?.folioSolicitud).toBe(solicitud.folio);
      expect(["USO_FUERA_DE_HORARIO", "FIN_DE_SEMANA_NO_AUTORIZADO"]).toContain(otra?.incidencia.tipoIncidencia);
    }
  });
});
