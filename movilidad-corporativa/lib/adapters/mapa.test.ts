/**
 * Pruebas de /mapa sobre el adaptador real (Dexie vía fake-indexeddb, mismo
 * patrón que el resto de los adaptadores) y sobre las funciones puras de
 * cálculo de estado/proyección.
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import { PARAMS_CONFIG } from "@/lib/config/params";
import type { Vehiculo } from "@/lib/models";
import { calcularEstadoMapa, obtenerDatosMapa, proyectarPosicion } from "./mapa";

function crearVehiculoBase(overrides: Partial<Vehiculo> = {}): Vehiculo {
  const ahora = new Date().toISOString();
  return {
    id: "veh-test",
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: "user-admin",
    estatus: "ACTIVO",
    placa: "TST-001",
    marca: "Test",
    modelo: "Modelo",
    anio: 2024,
    tipoVehiculo: "Sedán",
    modalidad: "POOL",
    territorioId: "territorio-cdmx",
    ubicacion: "Prueba",
    capacidadPasajeros: 4,
    combustibleTipo: "Gasolina",
    kilometrajeActual: 1000,
    rendimientoKmPorLitro: 14,
    estadoOperativo: "DISPONIBLE",
    disponibilidadActual: true,
    costoPorKm: 2.5,
    factorEmisionId: "factor-pool",
    ...overrides,
  };
}

describe("calcularEstadoMapa", () => {
  // Lunes 10:00, dentro de horario laboral.
  const dentroDeHorario = new Date("2026-08-10T10:00:00");
  // Sábado 10:00, fuera de horario laboral (fin de semana).
  const fueraDeHorario = new Date("2026-08-08T10:00:00");

  it("un vehículo disponible se marca DISPONIBLE", () => {
    expect(calcularEstadoMapa(crearVehiculoBase({ estadoOperativo: "DISPONIBLE" }), dentroDeHorario)).toBe("DISPONIBLE");
  });

  it("un vehículo en uso dentro de horario laboral se marca EN_USO", () => {
    expect(calcularEstadoMapa(crearVehiculoBase({ estadoOperativo: "OCUPADO" }), dentroDeHorario)).toBe("EN_USO");
  });

  it("un vehículo en uso fuera de horario laboral se marca FUERA_DE_HORARIO", () => {
    expect(calcularEstadoMapa(crearVehiculoBase({ estadoOperativo: "OCUPADO" }), fueraDeHorario)).toBe("FUERA_DE_HORARIO");
  });

  it("un vehículo en mantenimiento se marca EN_MANTENIMIENTO sin importar la hora", () => {
    expect(calcularEstadoMapa(crearVehiculoBase({ estadoOperativo: "EN_MANTENIMIENTO" }), dentroDeHorario)).toBe("EN_MANTENIMIENTO");
  });

  it("un vehículo bloqueado (fuera de servicio) se marca BLOQUEADO", () => {
    expect(calcularEstadoMapa(crearVehiculoBase({ estadoOperativo: "FUERA_DE_SERVICIO" }), dentroDeHorario)).toBe("BLOQUEADO");
  });
});

describe("proyectarPosicion", () => {
  it("Monterrey (más al norte) queda más arriba (menor y%) que Mérida", () => {
    const monterrey = proyectarPosicion(PARAMS_CONFIG.territorios["territorio-monterrey"]);
    const merida = proyectarPosicion(PARAMS_CONFIG.territorios["territorio-merida"]);
    expect(monterrey.yPorcentaje).toBeLessThan(merida.yPorcentaje);
  });

  it("Mérida (más al este) queda más a la derecha (mayor x%) que Guadalajara", () => {
    const merida = proyectarPosicion(PARAMS_CONFIG.territorios["territorio-merida"]);
    const guadalajara = proyectarPosicion(PARAMS_CONFIG.territorios["territorio-guadalajara"]);
    expect(merida.xPorcentaje).toBeGreaterThan(guadalajara.xPorcentaje);
  });

  it("retorna porcentajes dentro de 0-100 para los territorios configurados", () => {
    for (const territorio of Object.values(PARAMS_CONFIG.territorios)) {
      const { xPorcentaje, yPorcentaje } = proyectarPosicion(territorio);
      expect(xPorcentaje).toBeGreaterThanOrEqual(0);
      expect(xPorcentaje).toBeLessThanOrEqual(100);
      expect(yPorcentaje).toBeGreaterThanOrEqual(0);
      expect(yPorcentaje).toBeLessThanOrEqual(100);
    }
  });
});

describe("obtenerDatosMapa", () => {
  beforeEach(async () => {
    await initializeDemoData();
  });

  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it("incluye solo vehículos Pool/Asignado (excluye Uber) con posición cerca de su territorio", async () => {
    const datos = await obtenerDatosMapa();
    expect(datos.vehiculos.some((v) => v.vehiculo.modalidad === "UBER")).toBe(false);
    expect(datos.vehiculos).toHaveLength(7);

    const veh1 = datos.vehiculos.find((v) => v.vehiculo.id === "veh-1")!;
    const centro = PARAMS_CONFIG.territorios["territorio-cdmx"];
    expect(Math.abs(veh1.posicion.latitud - centro.latitud)).toBeLessThanOrEqual(0.7);
    expect(Math.abs(veh1.posicion.longitud - centro.longitud)).toBeLessThanOrEqual(0.7);
  });

  it("la posición simulada es determinística (misma llamada, mismo resultado)", async () => {
    const primera = await obtenerDatosMapa();
    const segunda = await obtenerDatosMapa();
    const veh1a = primera.vehiculos.find((v) => v.vehiculo.id === "veh-1")!;
    const veh1b = segunda.vehiculos.find((v) => v.vehiculo.id === "veh-1")!;
    expect(veh1a.posicion).toEqual(veh1b.posicion);
  });

  it("identifica al conductor actual de un vehículo con una reservación En curso", async () => {
    // Fixture propia y consistente: la solicitud sol-3 de la demo (user-5,
    // Patricia Vega) ya tiene una reservación "En curso" (res-3) pero el
    // vehículo de la demo (veh-6) quedó con estadoOperativo "DISPONIBLE" en
    // los datos semilla (dato suelto, no relevante para esta prueba), así
    // que se usa un vehículo "OCUPADO" propio para aislar el escenario.
    await db.vehiculos.add(
      crearVehiculoBase({ id: "veh-mapa-test", territorioId: "territorio-puebla", estadoOperativo: "OCUPADO", disponibilidadActual: false })
    );
    await db.reservaciones.add({
      id: "res-mapa-test",
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      usuarioCreadorId: "user-5",
      estatus: "ACTIVO",
      solicitudId: "sol-3", // user-5, Patricia Vega
      vehiculoId: "veh-mapa-test",
      modalidadAsignada: "POOL",
      fechaInicio: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      fechaFin: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      costoEstimado: 200,
      costoReal: 0,
      estadoReservacion: "EN_CURSO",
    });

    const datos = await obtenerDatosMapa();
    const vehiculo = datos.vehiculos.find((v) => v.vehiculo.id === "veh-mapa-test");
    expect(vehiculo?.estadoMapa === "EN_USO" || vehiculo?.estadoMapa === "FUERA_DE_HORARIO").toBe(true);
    expect(vehiculo?.conductorActualNombre).toBe("Patricia Vega");
  });

  it("marca null como conductor actual cuando el vehículo no está en uso", async () => {
    const datos = await obtenerDatosMapa();
    const veh1 = datos.vehiculos.find((v) => v.vehiculo.id === "veh-1");
    expect(veh1?.conductorActualNombre).toBeNull();
  });

  it("expone la próxima reservación programada de un vehículo", async () => {
    const datos = await obtenerDatosMapa();
    const veh7 = datos.vehiculos.find((v) => v.vehiculo.id === "veh-7"); // res-6, sol-9, 2026-08-20 (futuro)
    expect(veh7?.proximaReservacion).toMatchObject({ folio: "MOV-2025-000009" });
  });

  it("solo incluye orígenes de solicitudes en estados activos, no completadas/canceladas/rechazadas", async () => {
    const datos = await obtenerDatosMapa();
    const ids = datos.origenesSolicitudes.map((o) => o.solicitud.id);
    expect(ids).toContain("sol-2"); // PENDIENTE_APROBACION
    expect(ids).not.toContain("sol-1"); // COMPLETADA
    expect(ids).not.toContain("sol-7"); // CANCELADA
    expect(ids).not.toContain("sol-6"); // RECHAZADA
  });

  it("cada última actualización simulada es una fecha válida no futura", async () => {
    const datos = await obtenerDatosMapa();
    const ahora = Date.now();
    for (const v of datos.vehiculos) {
      expect(new Date(v.ultimaActualizacion).getTime()).toBeLessThanOrEqual(ahora);
    }
  });
});
