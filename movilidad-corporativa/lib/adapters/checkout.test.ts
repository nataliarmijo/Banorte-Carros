/**
 * Pruebas del check-out digital sobre el adaptador real (Dexie vía
 * fake-indexeddb, mismo patrón que checkin.test.ts y aprobaciones.test.ts).
 * Incluye el ciclo completo pedido: Nueva solicitud -> Aprobación ->
 * Asignación -> Check-in -> Check-out, verificando que el estado final
 * "Completada" y las cifras reales (costo, emisiones, km) queden guardadas
 * y visibles en el detalle de la reservación (Chunk 7).
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import { crearSolicitudDesdeWizard, type DatosViajeValidados } from "@/lib/adapters/solicitudes";
import { evaluarAlternativasParaSolicitud } from "@/lib/adapters/flota";
import { decidirSolicitud } from "@/lib/adapters/aprobaciones";
import { registrarCheckIn } from "@/lib/adapters/checkin";
import { listarSolicitudesDeUsuario, obtenerDetalleSolicitud } from "@/lib/adapters/reservaciones";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { esResultadoSinDatos } from "@/lib/services/types";
import type { CheckIn, Reservacion, Solicitud } from "@/lib/models";
import { obtenerContextoCheckOut, registrarCheckOut, type RegistrarCheckOutInput } from "./checkout";

const COLABORADOR_ID = "user-1"; // territorio-cdmx
const APROBADOR_ID = "user-2"; // territorio-cdmx
const VEHICULO_ID = "veh-1"; // Toyota Corolla, POOL, territorio-cdmx, kilometrajeActual 18250

async function crearReservacionEnCurso(overrides: Partial<CheckIn> = {}): Promise<{ solicitud: Solicitud; reservacion: Reservacion; checkIn: CheckIn }> {
  const ahora = new Date();
  const fechaInicio = new Date(ahora.getTime() - 60 * 60 * 1000);
  const fechaFin = new Date(ahora.getTime() + 3 * 60 * 60 * 1000);

  const solicitud: Solicitud = {
    id: "sol-checkout-test",
    fechaCreacion: ahora.toISOString(),
    fechaActualizacion: ahora.toISOString(),
    usuarioCreadorId: COLABORADOR_ID,
    estatus: "ACTIVO",
    folio: "MOV-2026-000901",
    usuarioSolicitanteId: COLABORADOR_ID,
    territorioId: "territorio-cdmx",
    fechaSolicitud: fechaInicio.toISOString().slice(0, 10),
    horaInicioDeseada: "09:00",
    horaFinDeseada: "13:00",
    origen: "Torre Banorte",
    destino: "Sucursal Reforma",
    distanciaEstimadaKm: 10,
    pasajeros: 1,
    motivoViaje: "Prueba de check-out",
    tipoViaje: "Corporativo",
    modalidadRequerida: "POOL",
    costoEstimado: 200,
    emisionesEstimadasGramos: 1500,
    estadoSolicitud: "EN_CURSO",
    prioridad: "MEDIA",
  };

  const reservacion: Reservacion = {
    id: "res-checkout-test",
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
    estadoReservacion: "EN_CURSO",
  };

  const checkIn: CheckIn = {
    id: "checkin-checkout-test",
    fechaCreacion: fechaInicio.toISOString(),
    fechaActualizacion: fechaInicio.toISOString(),
    usuarioCreadorId: COLABORADOR_ID,
    estatus: "ACTIVO",
    reservacionId: reservacion.id,
    usuarioId: COLABORADOR_ID,
    fechaHoraCheckIn: fechaInicio.toISOString(),
    ubicacion: "Torre Banorte",
    kilometrajeInicial: 18250,
    combustibleInicial: 80,
    fotos: ["data:image/png;base64,checkin-foto"],
    firmaElectronica: "data:image/png;base64,firma",
    responsivaAceptada: true,
    ...overrides,
  };

  await db.solicitudes.add(solicitud);
  await db.reservaciones.add(reservacion);
  await db.checkIns.add(checkIn);
  return { solicitud, reservacion, checkIn };
}

function inputValido(reservacionId: string, overrides: Partial<RegistrarCheckOutInput> = {}): RegistrarCheckOutInput {
  return {
    reservacionId,
    usuarioId: COLABORADOR_ID,
    kilometrajeFinal: 18300,
    combustibleRestante: 55,
    fotos: ["data:image/png;base64,checkout-foto"],
    estadoVehiculo: "BUENO",
    llavesDevueltas: true,
    ...overrides,
  };
}

describe("check-out digital", () => {
  beforeEach(async () => {
    await initializeDemoData();
  });

  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it("bloquea con un mensaje claro si la solicitud no está 'En curso'", async () => {
    const { reservacion } = await crearReservacionEnCurso();
    await db.solicitudes.update(reservacion.solicitudId, { estadoSolicitud: "ASIGNADA" });

    const contexto = await obtenerContextoCheckOut(reservacion.id);
    expect(esResultadoSinDatos(contexto)).toBe(true);
    if (esResultadoSinDatos(contexto)) {
      expect(contexto.detalle).toContain("En curso");
    }
  });

  it("bloquea el check-out si no existe el check-in de la reservación", async () => {
    const { reservacion } = await crearReservacionEnCurso();
    await db.checkIns.clear();

    const contexto = await obtenerContextoCheckOut(reservacion.id);
    expect(esResultadoSinDatos(contexto)).toBe(true);
    if (esResultadoSinDatos(contexto)) {
      expect(contexto.detalle).toContain("check-in");
    }
  });

  it("rechaza un kilometraje final menor al inicial y no cambia el estado", async () => {
    const { reservacion } = await crearReservacionEnCurso();

    const resultado = await registrarCheckOut(inputValido(reservacion.id, { kilometrajeFinal: 100 }));
    expect(esResultadoSinDatos(resultado)).toBe(true);

    const reservacionSinCambios = await db.reservaciones.get(reservacion.id);
    expect(reservacionSinCambios?.estadoReservacion).toBe("EN_CURSO");
  });

  it("rechaza el check-out cuando faltan datos obligatorios (fotos, llaves)", async () => {
    const { reservacion } = await crearReservacionEnCurso();
    const resultado = await registrarCheckOut(inputValido(reservacion.id, { fotos: [], llavesDevueltas: false }));
    expect(esResultadoSinDatos(resultado)).toBe(true);
  });

  it("confirma el check-out: calcula cifras reales, cierra la reservación como Completada y se refleja en Mis reservaciones", async () => {
    const { reservacion, solicitud } = await crearReservacionEnCurso();

    const resultado = await registrarCheckOut(inputValido(reservacion.id));
    if (esResultadoSinDatos(resultado)) {
      throw new Error(`se esperaba un check-out exitoso: ${resultado.detalle}`);
    }

    expect(resultado.checkOut.kilometrosRecorridos).toBe(50); // 18300 - 18250
    expect(resultado.checkOut.costoReal).toBeGreaterThan(0);
    expect(resultado.checkOut.emisionesRealesGramos).toBeGreaterThan(0);
    expect(resultado.resumen.kilometrosRecorridos).toBe(50);
    expect(resultado.resumen.costoEstimado).toBe(200);
    expect(resultado.resumen.emisionesEstimadasGramos).toBe(1500);

    const reservacionActualizada = await db.reservaciones.get(reservacion.id);
    expect(reservacionActualizada?.estadoReservacion).toBe("COMPLETADA");
    expect(reservacionActualizada?.costoReal).toBe(resultado.checkOut.costoReal);

    const solicitudActualizada = await db.solicitudes.get(solicitud.id);
    expect(solicitudActualizada?.estadoSolicitud).toBe("COMPLETADA");

    const vehiculoActualizado = await db.vehiculos.get(VEHICULO_ID);
    expect(vehiculoActualizado?.kilometrajeActual).toBe(18300);
    expect(vehiculoActualizado?.estadoOperativo).toBe("DISPONIBLE");
    expect(vehiculoActualizado?.disponibilidadActual).toBe(true);

    const auditorias = await db.registrosAuditoria.where("entidadId").equals(reservacion.id).toArray();
    expect(auditorias.some((a) => a.accion === "CHECK_OUT")).toBe(true);

    // Chunk 7: Mis reservaciones y el detalle deben reflejar el estado final y las cifras reales.
    const misReservaciones = await listarSolicitudesDeUsuario(COLABORADOR_ID);
    const item = misReservaciones.find((r) => r.solicitud.id === solicitud.id);
    expect(item?.solicitud.estadoSolicitud).toBe("COMPLETADA");

    const detalle = await obtenerDetalleSolicitud(solicitud.id);
    expect(detalle?.checkOut?.kilometrosRecorridos).toBe(50);
    expect(detalle?.checkOut?.costoReal).toBe(resultado.checkOut.costoReal);
    expect(detalle?.timeline.find((h) => h.clave === "completada")?.estado).toBe("completado");
  });

  it("reporta daños al devolver el vehículo: crea una Incidencia automática y deja el vehículo fuera de servicio", async () => {
    const { reservacion } = await crearReservacionEnCurso();

    const resultado = await registrarCheckOut(
      inputValido(reservacion.id, { estadoVehiculo: "CON_DANOS", danosDescripcion: "Rayón profundo en la puerta izquierda" })
    );
    if (esResultadoSinDatos(resultado)) {
      throw new Error(`se esperaba un check-out exitoso: ${resultado.detalle}`);
    }

    // Siempre hay al menos la incidencia de daños; puede haber una segunda si,
    // además, el momento real en que corre la prueba cae fuera de horario laboral.
    expect(resultado.checkOut.incidenciasCreadasIds.length).toBe(resultado.resumen.fueraDeHorarioNoAutorizado ? 2 : 1);

    const incidencias = await Promise.all(resultado.checkOut.incidenciasCreadasIds.map((id) => db.incidencias.get(id)));
    const incidenciaDanos = incidencias.find((i) => i?.tipoIncidencia === "DANOS");
    expect(incidenciaDanos).toBeDefined();
    expect(incidenciaDanos?.severidad).toBe("ALTA");
    expect(incidenciaDanos?.descripcion).toContain("Rayón profundo");

    const vehiculoActualizado = await db.vehiculos.get(VEHICULO_ID);
    expect(vehiculoActualizado?.estadoOperativo).toBe("EN_MANTENIMIENTO");
    expect(vehiculoActualizado?.disponibilidadActual).toBe(false);
  });

  it("exige describir los daños para completar el check-out cuando el estado es 'con daños'", async () => {
    const { reservacion } = await crearReservacionEnCurso();
    const resultado = await registrarCheckOut(inputValido(reservacion.id, { estadoVehiculo: "CON_DANOS" }));
    expect(esResultadoSinDatos(resultado)).toBe(true);
  });

  it("ciclo completo: Nueva solicitud -> Aprobación -> Asignación -> Check-in -> Check-out", async () => {
    const ahora = new Date();
    const fechaSalida = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
    const fechaRegreso = new Date(ahora.getTime() + 5 * 60 * 60 * 1000);
    // Componentes en hora LOCAL (no toISOString, que es UTC y puede caer en otro
    // día calendario que la hora local, igual que un <input type="date"> real).
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    // 80 km en sedán ejecutivo (Asignado) siempre supera el límite de costo del
    // colaborador y sigue siendo más barato que Uber a cualquier factor de
    // demanda, así que dispara aprobación especial de forma determinista sin
    // depender del día/hora reales en que corra la prueba.
    const datos: DatosViajeValidados = {
      territorio: "territorio-cdmx",
      origen: "Torre Banorte",
      destino: "Planta Toluca",
      fechaSalida: fmt(fechaSalida),
      horaSalida: hhmm(fechaSalida),
      fechaRegreso: fmt(fechaRegreso),
      horaRegreso: hhmm(fechaRegreso),
      distanciaEstimadaKm: 80,
      pasajeros: 2,
      motivoViaje: "Ciclo completo de prueba",
      tipoVehiculoRequerido: "sedan-ejecutivo",
      transportaEquipo: false,
    };
    const duracionEstimadaMinutos = 100;

    // 1. Nueva solicitud (Chunk 6): se recalcula la comparación con servicioComparador.
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
    expect(evaluacion.resultado.recomendada).toBe("ASIGNADO");

    const envio = await crearSolicitudDesdeWizard({
      datos,
      fechaSalida,
      fechaRegreso,
      duracionEstimadaMinutos,
      alternativaSeleccionada: evaluacion.resultado.recomendada,
      resultado: evaluacion.resultado,
      usuarioSolicitanteId: COLABORADOR_ID,
      limiteCostoAprobacion: PARAMS_CONFIG.limitesCostoEspecial.colaborador,
    });
    expect(envio.estado).toBe("PENDIENTE_APROBACION");

    // 2. Aprobación (Chunk 9) + 3. Asignación automática (Chunk 5, dentro de la aprobación).
    const decision = await decidirSolicitud({
      solicitudId: envio.solicitudId,
      aprobadorId: APROBADOR_ID,
      decision: "APROBAR",
      comentario: "",
    });
    if (esResultadoSinDatos(decision)) {
      throw new Error(`se esperaba una aprobación exitosa: ${decision.detalle}`);
    }
    expect(decision.solicitud.estadoSolicitud).toBe("ASIGNADA");
    expect(decision.reservacion).toBeDefined();
    const reservacionId = decision.reservacion!.id;
    const vehiculoAsignadoId = decision.reservacion!.vehiculoId;
    const vehiculoAntesDeCheckIn = await db.vehiculos.get(vehiculoAsignadoId);

    // 4. Check-in.
    const checkIn = await registrarCheckIn({
      reservacionId,
      usuarioId: COLABORADOR_ID,
      ubicacion: datos.origen,
      kilometrajeInicial: vehiculoAntesDeCheckIn!.kilometrajeActual,
      combustibleInicial: 90,
      fotos: ["data:image/png;base64,checkin-foto"],
      firmaElectronica: "data:image/png;base64,firma-checkin",
      responsivaAceptada: true,
    });
    if (esResultadoSinDatos(checkIn)) {
      throw new Error(`se esperaba un check-in exitoso: ${checkIn.detalle}`);
    }

    let solicitudEnCurso = await db.solicitudes.get(envio.solicitudId);
    expect(solicitudEnCurso?.estadoSolicitud).toBe("EN_CURSO");

    // 5. Check-out.
    const kilometrajeFinal = checkIn.kilometrajeInicial + datos.distanciaEstimadaKm;
    const checkOutResultado = await registrarCheckOut({
      reservacionId,
      usuarioId: COLABORADOR_ID,
      kilometrajeFinal,
      combustibleRestante: 60,
      fotos: ["data:image/png;base64,checkout-foto"],
      estadoVehiculo: "BUENO",
      llavesDevueltas: true,
    });
    if (esResultadoSinDatos(checkOutResultado)) {
      throw new Error(`se esperaba un check-out exitoso: ${checkOutResultado.detalle}`);
    }

    expect(checkOutResultado.checkOut.kilometrosRecorridos).toBe(datos.distanciaEstimadaKm);
    expect(checkOutResultado.resumen.costoReal).toBeGreaterThan(0);
    expect(checkOutResultado.resumen.emisionesRealesGramos).toBeGreaterThan(0);
    // Sin daños reportados: solo puede haber incidencia si el uso fue fuera de
    // horario y no estaba autorizado (independiente de la hora real en que corre la prueba).
    expect(checkOutResultado.checkOut.incidenciasCreadasIds).toHaveLength(
      checkOutResultado.resumen.fueraDeHorarioNoAutorizado ? 1 : 0
    );

    // Estado final "Completada" en todas las capas.
    const reservacionFinal = await db.reservaciones.get(reservacionId);
    expect(reservacionFinal?.estadoReservacion).toBe("COMPLETADA");
    solicitudEnCurso = await db.solicitudes.get(envio.solicitudId);
    expect(solicitudEnCurso?.estadoSolicitud).toBe("COMPLETADA");

    // Chunk 7: cifras reales visibles en el detalle de la reservación.
    const detalle = await obtenerDetalleSolicitud(envio.solicitudId);
    expect(detalle?.solicitud.estadoSolicitud).toBe("COMPLETADA");
    expect(detalle?.checkOut).not.toBeNull();
    expect(detalle?.checkOut?.kilometrosRecorridos).toBe(datos.distanciaEstimadaKm);
    expect(detalle?.checkOut?.costoReal).toBe(checkOutResultado.checkOut.costoReal);
    expect(detalle?.checkOut?.emisionesRealesGramos).toBe(checkOutResultado.checkOut.emisionesRealesGramos);
    expect(detalle?.reservacion?.costoReal).toBe(checkOutResultado.checkOut.costoReal);
    expect(detalle?.timeline.every((h) => h.estado !== "pendiente")).toBe(true);

    const misReservaciones = await listarSolicitudesDeUsuario(COLABORADOR_ID);
    const item = misReservaciones.find((r) => r.solicitud.id === envio.solicitudId);
    expect(item?.solicitud.estadoSolicitud).toBe("COMPLETADA");
    expect(item?.reservacion?.estadoReservacion).toBe("COMPLETADA");
  });
});
