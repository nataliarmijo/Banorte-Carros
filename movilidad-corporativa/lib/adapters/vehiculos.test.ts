/**
 * Pruebas de integración de /vehiculos (catálogo editable, Admin Flota)
 * sobre el adaptador real (Dexie vía fake-indexeddb, mismo patrón que el
 * resto de los adaptadores). Incluye la verificación explícita de que un
 * vehículo bloqueado o en mantenimiento queda excluido del motor de
 * asignación (Chunk 5) y de la comparación de alternativas (Chunk 6), y de
 * que un cambio de modalidad mueve correctamente el conteo Pool/Asignado
 * que alimentará el indicador 60/40 del dashboard ejecutivo (Chunk 15).
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import { asignarVehiculoDeFlota } from "@/lib/adapters/flota";
import type { SolicitudAsignacion } from "@/lib/services/servicioAsignacion";
import { esResultadoSinDatos } from "@/lib/services/types";
import type { DatosVehiculo } from "./vehiculos";
import {
  actualizarVehiculo,
  bloquearVehiculo,
  cambiarModalidad,
  cambiarTerritorio,
  crearVehiculo,
  desbloquearVehiculo,
  listarCatalogoVehiculos,
  obtenerComposicionFlotilla,
  obtenerDetalleVehiculo,
  programarMantenimiento,
} from "./vehiculos";

const ADMIN_ID = "user-admin";

function datosVehiculoValidos(overrides: Partial<DatosVehiculo> = {}): DatosVehiculo {
  return {
    placa: "ZZZ-999",
    marca: "Mazda",
    modelo: "3",
    anio: 2023,
    tipoVehiculo: "Sedán",
    modalidad: "POOL",
    territorioId: "territorio-cdmx",
    ubicacion: "Estacionamiento Torre Banorte, CDMX",
    capacidadPasajeros: 4,
    combustibleTipo: "Gasolina",
    kilometrajeActual: 500,
    rendimientoKmPorLitro: 15,
    costoPorKm: 2.5,
    ...overrides,
  };
}

describe("/vehiculos (catálogo editable, Admin Flota)", () => {
  beforeEach(async () => {
    await initializeDemoData();
  });

  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it("lista el catálogo con territorio, usuario asignado, incidencias abiertas y factor de emisiones", async () => {
    const catalogo = await listarCatalogoVehiculos();
    expect(catalogo).toHaveLength(8);

    const veh2 = catalogo.find((c) => c.vehiculo.id === "veh-2");
    expect(veh2?.territorioNombre).toBe("Guadalajara");
    expect(veh2?.usuarioAsignadoNombre).toBe("Sofía Méndez");
    expect(veh2?.incidenciasAbiertas).toBe(1); // inc-1
    expect(veh2?.factorEmisionValor).toBe(0.14);

    const veh1 = catalogo.find((c) => c.vehiculo.id === "veh-1");
    expect(veh1?.usuarioAsignadoNombre).toBeNull(); // es POOL, no tiene usuario asignado
  });

  it("crea un vehículo nuevo y rechaza una placa duplicada", async () => {
    const creado = await crearVehiculo(datosVehiculoValidos(), ADMIN_ID);
    if (esResultadoSinDatos(creado)) throw new Error(`se esperaba éxito: ${creado.detalle}`);
    expect(creado.placa).toBe("ZZZ-999");
    expect(creado.estadoOperativo).toBe("DISPONIBLE");
    expect(creado.factorEmisionId).toBe("factor-pool");

    const duplicado = await crearVehiculo(datosVehiculoValidos({ placa: "zzz-999" }), ADMIN_ID);
    expect(esResultadoSinDatos(duplicado)).toBe(true);

    const auditorias = await db.registrosAuditoria.where("entidadId").equals(creado.id).toArray();
    expect(auditorias.some((a) => a.accion === "CREAR")).toBe(true);
  });

  it("edita los datos generales sin alterar territorio ni modalidad", async () => {
    const actualizado = await actualizarVehiculo(
      "veh-1",
      datosVehiculoValidos({ placa: "ABC-123", modalidad: "ASIGNADO", territorioId: "territorio-monterrey", kilometrajeActual: 20000 }),
      ADMIN_ID
    );
    if (esResultadoSinDatos(actualizado)) throw new Error(`se esperaba éxito: ${actualizado.detalle}`);

    expect(actualizado.kilometrajeActual).toBe(20000);
    expect(actualizado.marca).toBe("Mazda");
    // territorio y modalidad no cambian por esta vía, aunque vengan en el payload:
    expect(actualizado.modalidad).toBe("POOL");
    expect(actualizado.territorioId).toBe("territorio-cdmx");
  });

  it("bloquear exige motivo, y un vehículo bloqueado queda excluido de la asignación (Chunk 5/6)", async () => {
    const sinMotivo = await bloquearVehiculo("veh-8", "", ADMIN_ID);
    expect(esResultadoSinDatos(sinMotivo)).toBe(true);

    const bloqueado = await bloquearVehiculo("veh-8", "Placa reportada con documentación vencida", ADMIN_ID);
    if (esResultadoSinDatos(bloqueado)) throw new Error(`se esperaba éxito: ${bloqueado.detalle}`);
    expect(bloqueado.estadoOperativo).toBe("FUERA_DE_SERVICIO");
    expect(bloqueado.disponibilidadActual).toBe(false);

    const auditorias = await db.registrosAuditoria.where("entidadId").equals("veh-8").toArray();
    expect(auditorias.some((a) => a.accion === "BLOQUEO" && a.cambiosJson.includes("documentación vencida"))).toBe(true);

    // veh-1 y veh-8 son los únicos POOL disponibles en cdmx; al bloquear veh-8 solo debe recomendarse veh-1.
    const solicitud: SolicitudAsignacion = {
      territorio: "territorio-cdmx",
      origen: "territorio-cdmx",
      fechaSalida: new Date(Date.now() + 2 * 60 * 60 * 1000),
      fechaRegreso: new Date(Date.now() + 5 * 60 * 60 * 1000),
      tipoVehiculoRequerido: "sedan-compacto",
      pasajeros: 2,
    };
    const resultado = await asignarVehiculoDeFlota("territorio-cdmx", "POOL", solicitud);
    if (esResultadoSinDatos(resultado)) throw new Error(`se esperaba éxito: ${resultado.detalle}`);
    expect(resultado.recomendado.vehiculo.id).not.toBe("veh-8");
    expect(resultado.recomendado.vehiculo.id).toBe("veh-1");

    // Desbloquear lo regresa a disponible.
    const desbloqueado = await desbloquearVehiculo("veh-8", ADMIN_ID);
    if (esResultadoSinDatos(desbloqueado)) throw new Error(`se esperaba éxito: ${desbloqueado.detalle}`);
    expect(desbloqueado.estadoOperativo).toBe("DISPONIBLE");
    expect(desbloqueado.disponibilidadActual).toBe(true);

    const yaNoBloqueado = await desbloquearVehiculo("veh-8", ADMIN_ID);
    expect(esResultadoSinDatos(yaNoBloqueado)).toBe(true);
  });

  it("programar mantenimiento para hoy pone el vehículo en mantenimiento de inmediato, y queda excluido de la asignación", async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const resultado = await programarMantenimiento(
      "veh-8",
      { fechaProgramada: hoy, tipoMantenimiento: "SERVICIO_MAYOR", responsable: "Taller Banorte Sur (simulado)" },
      ADMIN_ID
    );
    if (esResultadoSinDatos(resultado)) throw new Error(`se esperaba éxito: ${resultado.detalle}`);

    const vehiculo = await db.vehiculos.get("veh-8");
    expect(vehiculo?.estadoOperativo).toBe("EN_MANTENIMIENTO");
    expect(vehiculo?.disponibilidadActual).toBe(false);

    const solicitud: SolicitudAsignacion = {
      territorio: "territorio-cdmx",
      origen: "territorio-cdmx",
      fechaSalida: new Date(Date.now() + 2 * 60 * 60 * 1000),
      fechaRegreso: new Date(Date.now() + 5 * 60 * 60 * 1000),
      tipoVehiculoRequerido: "sedan-compacto",
      pasajeros: 1,
    };
    const asignacion = await asignarVehiculoDeFlota("territorio-cdmx", "POOL", solicitud);
    if (esResultadoSinDatos(asignacion)) throw new Error(`se esperaba éxito: ${asignacion.detalle}`);
    expect(asignacion.recomendado.vehiculo.id).toBe("veh-1");
  });

  it("programar mantenimiento para una fecha futura no cambia el estado operativo todavía", async () => {
    const futura = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await programarMantenimiento("veh-1", { fechaProgramada: futura, tipoMantenimiento: "AFINACION", responsable: "Taller Banorte" }, ADMIN_ID);

    const vehiculo = await db.vehiculos.get("veh-1");
    expect(vehiculo?.estadoOperativo).toBe("DISPONIBLE");
  });

  it("cambia el territorio de un vehículo y lo deja registrado en auditoría", async () => {
    const resultado = await cambiarTerritorio("veh-6", "territorio-puebla", ADMIN_ID);
    if (esResultadoSinDatos(resultado)) throw new Error(`se esperaba éxito: ${resultado.detalle}`);
    expect(resultado.territorioId).toBe("territorio-puebla");

    const auditorias = await db.registrosAuditoria.where("entidadId").equals("veh-6").toArray();
    const cambio = auditorias.find((a) => a.accion === "CAMBIO_TERRITORIO");
    expect(cambio).toBeDefined();
    const cambios = JSON.parse(cambio!.cambiosJson);
    expect(cambios.territorioAnteriorId).toBe("territorio-merida");
    expect(cambios.territorioNuevoId).toBe("territorio-puebla");
  });

  it("un cambio de modalidad Pool -> Asignado mueve correctamente el conteo 60/40 del dashboard ejecutivo", async () => {
    const antes = await obtenerComposicionFlotilla();
    // demoVehiculos (sin Uber): POOL veh-1,3,6,8 (4) / ASIGNADO veh-2,5,7 (3) = 7 total
    expect(antes).toMatchObject({ totalFlota: 7, poolCount: 4, asignadoCount: 3 });

    const resultado = await cambiarModalidad("veh-1", "ASIGNADO", ADMIN_ID);
    if (esResultadoSinDatos(resultado)) throw new Error(`se esperaba éxito: ${resultado.detalle}`);
    expect(resultado.modalidad).toBe("ASIGNADO");
    expect(resultado.factorEmisionId).toBe("factor-asignado");

    const despues = await obtenerComposicionFlotilla();
    expect(despues).toMatchObject({ totalFlota: 7, poolCount: 3, asignadoCount: 4 });
    expect(despues.asignadoPorcentaje).toBeGreaterThan(antes.asignadoPorcentaje);

    const auditorias = await db.registrosAuditoria.where("entidadId").equals("veh-1").toArray();
    const cambio = auditorias.find((a) => a.accion === "CAMBIO_MODALIDAD");
    expect(cambio).toBeDefined();
    const cambios = JSON.parse(cambio!.cambiosJson);
    expect(cambios).toMatchObject({ modalidadAnterior: "POOL", modalidadNueva: "ASIGNADO" });
  });

  it("no permite cambiar la modalidad de un vehículo Uber", async () => {
    const resultado = await cambiarModalidad("veh-4", "POOL", ADMIN_ID);
    expect(esResultadoSinDatos(resultado)).toBe(true);
  });

  it("limpia el usuario asignado al cambiar de Asignado a Pool", async () => {
    const antes = await db.vehiculos.get("veh-2");
    expect(antes?.usuarioAsignadoId).toBe("user-3");

    const resultado = await cambiarModalidad("veh-2", "POOL", ADMIN_ID);
    if (esResultadoSinDatos(resultado)) throw new Error(`se esperaba éxito: ${resultado.detalle}`);
    expect(resultado.usuarioAsignadoId).toBeUndefined();
  });

  it("arma el detalle con historial, reservaciones pasadas, tendencia de utilización y motivo de bloqueo vigente", async () => {
    await bloquearVehiculo("veh-1", "Revisión de siniestro menor", ADMIN_ID);

    const detalle = await obtenerDetalleVehiculo("veh-1");
    expect(detalle).not.toBeNull();
    expect(detalle?.reservacionesPasadas.some((r) => r.folio === "MOV-2025-000001")).toBe(true);
    expect(detalle?.tendenciaUtilizacion).toHaveLength(6);
    expect(detalle?.motivoBloqueoActual).toBe("Revisión de siniestro menor");
    expect(detalle?.cambios.some((c) => c.accion === "BLOQUEO")).toBe(true);

    await desbloquearVehiculo("veh-1", ADMIN_ID);
    const detalleDespues = await obtenerDetalleVehiculo("veh-1");
    expect(detalleDespues?.motivoBloqueoActual).toBeNull();
  });

  it("retorna null al pedir el detalle de un vehículo inexistente", async () => {
    const detalle = await obtenerDetalleVehiculo("veh-inexistente");
    expect(detalle).toBeNull();
  });
});
