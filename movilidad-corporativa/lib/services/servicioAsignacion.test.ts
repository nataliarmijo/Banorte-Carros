import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { reservacionesRepository } from "@/lib/repositories/typed-repositories";
import {
  reasignarManualmente,
  recomendarVehiculo,
  type SolicitudAsignacion,
  type VehiculoCandidato,
} from "./servicioAsignacion";

function crearVehiculo(overrides: Partial<VehiculoCandidato> = {}): VehiculoCandidato {
  return {
    id: "veh-1",
    nombre: "Vehículo de prueba",
    tipoVehiculo: "sedan-compacto",
    territorioId: "territorio-cdmx",
    capacidadPasajeros: 4,
    disponibilidadActual: true,
    estadoOperativo: "DISPONIBLE",
    kilometrajeActual: 10000,
    reservacionesExistentes: [],
    viajesRecientes: 5,
    diasHastaProximoMantenimiento: 30,
    incidenciasRecientes: 0,
    ...overrides,
  };
}

const solicitudBase: SolicitudAsignacion = {
  territorio: "territorio-cdmx",
  origen: "territorio-cdmx",
  fechaSalida: new Date(2026, 7, 10, 9, 0),
  fechaRegreso: new Date(2026, 7, 10, 18, 0),
  tipoVehiculoRequerido: "sedan-compacto",
  pasajeros: 3,
};

describe("recomendarVehiculo", () => {
  it("nunca recomienda un vehículo no disponible aunque tenga el mejor puntaje en los demás criterios", () => {
    const excelentePeroOcupado = crearVehiculo({
      id: "excelente-ocupado",
      kilometrajeActual: 1000, // mejor balance de kilometraje
      viajesRecientes: 0, // mejor utilización
      diasHastaProximoMantenimiento: 365, // menor riesgo de mantenimiento
      incidenciasRecientes: 0, // sin incidencias
      reservacionesExistentes: [
        { fechaInicio: new Date(2026, 7, 10, 8, 0), fechaFin: new Date(2026, 7, 10, 20, 0) },
      ],
    });
    const mediocrePeroDisponible = crearVehiculo({
      id: "mediocre-disponible",
      kilometrajeActual: 80000,
      viajesRecientes: 15,
      diasHastaProximoMantenimiento: 5,
      incidenciasRecientes: 3,
    });

    const resultado = recomendarVehiculo(solicitudBase, [
      excelentePeroOcupado,
      mediocrePeroDisponible,
    ]);

    if (!("recomendado" in resultado)) {
      throw new Error("se esperaba un resultado válido, no 'Sin datos suficientes'");
    }
    expect(resultado.recomendado.vehiculo.id).toBe("mediocre-disponible");
    expect(
      resultado.alternativas.some((alt) => alt.vehiculo.id === "excelente-ocupado")
    ).toBe(false);
  });

  it("excluye vehículos bloqueados o en mantenimiento aunque no tengan traslapes de fechas", () => {
    const bloqueado = crearVehiculo({ id: "bloqueado", disponibilidadActual: false });
    const enMantenimiento = crearVehiculo({
      id: "mantenimiento",
      estadoOperativo: "EN_MANTENIMIENTO",
    });
    const disponible = crearVehiculo({ id: "disponible-ok" });

    const resultado = recomendarVehiculo(solicitudBase, [bloqueado, enMantenimiento, disponible]);

    if (!("recomendado" in resultado)) {
      throw new Error("se esperaba un resultado válido, no 'Sin datos suficientes'");
    }
    expect(resultado.recomendado.vehiculo.id).toBe("disponible-ok");
    expect(resultado.totalCandidatosDisponibles).toBe(1);
  });

  it("retorna 'Sin datos suficientes' cuando ningún vehículo está disponible en el periodo", () => {
    const ocupado = crearVehiculo({
      reservacionesExistentes: [
        { fechaInicio: solicitudBase.fechaSalida, fechaFin: solicitudBase.fechaRegreso },
      ],
    });

    const resultado = recomendarVehiculo(solicitudBase, [ocupado]);
    expect(resultado).toMatchObject({ exito: false, error: "Sin datos suficientes" });
  });

  it("ordena hasta dos alternativas detrás del recomendado, con desglose por criterio", () => {
    const a = crearVehiculo({ id: "a", kilometrajeActual: 5000 });
    const b = crearVehiculo({ id: "b", kilometrajeActual: 50000 });
    const c = crearVehiculo({ id: "c", kilometrajeActual: 90000 });

    const resultado = recomendarVehiculo(solicitudBase, [c, a, b]);

    if (!("recomendado" in resultado)) {
      throw new Error("se esperaba un resultado válido, no 'Sin datos suficientes'");
    }
    expect(resultado.recomendado.vehiculo.id).toBe("a");
    expect(resultado.alternativas.map((alt) => alt.vehiculo.id)).toEqual(["b", "c"]);
    expect(resultado.recomendado.desglose).toHaveProperty("compatibilidad");
    expect(resultado.recomendado.desglose).toHaveProperty("balanceKilometraje");
  });
});

describe("reasignarManualmente", () => {
  afterEach(async () => {
    await db.reservaciones.clear();
    await db.registrosAuditoria.clear();
  });

  it("rechaza la reasignación sin justificación", async () => {
    const resultado = await reasignarManualmente("sol-1", "veh-nuevo", "", "user-1");

    expect(resultado).toMatchObject({ exito: false, error: "Sin datos suficientes" });
    expect(await db.registrosAuditoria.count()).toBe(0);
  });

  it("rechaza la reasignación con una justificación de solo espacios en blanco", async () => {
    const resultado = await reasignarManualmente("sol-1", "veh-nuevo", "   ", "user-1");
    expect(resultado).toMatchObject({ exito: false, error: "Sin datos suficientes" });
  });

  it("actualiza la reservación y deja registro en auditoría cuando hay justificación", async () => {
    await reservacionesRepository.create({
      id: "res-1",
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      usuarioCreadorId: "user-0",
      estatus: "ACTIVO",
      solicitudId: "sol-1",
      vehiculoId: "veh-anterior",
      modalidadAsignada: "ASIGNADO",
      fechaInicio: new Date().toISOString(),
      fechaFin: new Date().toISOString(),
      costoEstimado: 500,
      costoReal: 0,
      estadoReservacion: "ASIGNADA",
    });

    const resultado = await reasignarManualmente(
      "sol-1",
      "veh-nuevo",
      "El vehículo asignado presentó una falla mecánica",
      "user-admin"
    );

    if (!resultado.exito) {
      throw new Error("se esperaba una reasignación exitosa");
    }
    expect(resultado.reservacion.vehiculoId).toBe("veh-nuevo");

    const reservacionPersistida = await db.reservaciones.get("res-1");
    expect(reservacionPersistida?.vehiculoId).toBe("veh-nuevo");

    const auditorias = await db.registrosAuditoria.toArray();
    expect(auditorias).toHaveLength(1);
    expect(auditorias[0].usuarioId).toBe("user-admin");
    expect(auditorias[0].entidadId).toBe("res-1");

    const cambios = JSON.parse(auditorias[0].cambiosJson);
    expect(cambios.vehiculoAnteriorId).toBe("veh-anterior");
    expect(cambios.vehiculoNuevoId).toBe("veh-nuevo");
    expect(cambios.justificacion).toContain("falla mecánica");
  });

  it("retorna 'Sin datos suficientes' si la solicitud no tiene reservación asociada", async () => {
    const resultado = await reasignarManualmente(
      "sol-inexistente",
      "veh-nuevo",
      "motivo válido",
      "user-1"
    );
    expect(resultado).toMatchObject({ exito: false, error: "Sin datos suficientes" });
  });
});
