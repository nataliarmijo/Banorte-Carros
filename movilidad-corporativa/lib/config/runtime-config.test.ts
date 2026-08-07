/**
 * Pruebas de runtimeConfig (/administracion, Chunk 17): sincronización con
 * Dexie, mutación en vivo de los objetos de /lib/config (para que los
 * servicios recalculen sin cambiar su código), validación, auditoría por
 * campo y restablecimiento a los valores de fábrica.
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { COSTOS_CONFIG } from "@/lib/config/costos";
import { ASIGNACION_CONFIG } from "@/lib/config/asignacion";
import { calcularCostoUber } from "@/lib/services/servicio-costos";
import { esResultadoSinDatos } from "@/lib/services/types";
import {
  guardarSeccionConfiguracion,
  restablecerConfiguracionADefecto,
  sincronizarConfiguracionPersistida,
  type ValorHorarioLaboral,
} from "./runtime-config";

const ADMIN_ID = "user-admin";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  await restablecerConfiguracionADefecto();
  await db.delete();
  await db.open();
});

describe("sincronizarConfiguracionPersistida", () => {
  it("siembra una fila por cada sección la primera vez", async () => {
    await sincronizarConfiguracionPersistida();
    const filas = await db.parametrosOperativos.toArray();
    expect(filas.length).toBeGreaterThan(5);
    expect(filas.some((f) => f.clave === "horarioLaboral")).toBe(true);
    expect(filas.some((f) => f.clave === "asignacionPesos")).toBe(true);
  });

  it("es idempotente: llamarlo dos veces no duplica filas", async () => {
    await sincronizarConfiguracionPersistida();
    const conteo1 = await db.parametrosOperativos.count();
    await sincronizarConfiguracionPersistida();
    const conteo2 = await db.parametrosOperativos.count();
    expect(conteo2).toBe(conteo1);
  });

  it("aplica en memoria un override ya persistido (simula la siguiente vista tras un guardado)", async () => {
    await sincronizarConfiguracionPersistida();
    await guardarSeccionConfiguracion(
      "horarioLaboral",
      { horaInicio: 7, horaFin: 19, diasLaborales: [1, 2, 3, 4, 5] } satisfies ValorHorarioLaboral,
      ADMIN_ID
    );
    expect(PARAMS_CONFIG.horarioLaboral.horaInicio).toBe(7);

    // Simula un "reinicio" del módulo aplicando de nuevo desde Dexie sobre un valor en memoria distinto.
    (PARAMS_CONFIG.horarioLaboral as { horaInicio: number }).horaInicio = 999;
    await sincronizarConfiguracionPersistida();
    expect(PARAMS_CONFIG.horarioLaboral.horaInicio).toBe(7);
  });
});

describe("guardarSeccionConfiguracion", () => {
  it("muta en vivo el objeto de configuración (sin que ningún servicio cambie su código)", async () => {
    const antes = COSTOS_CONFIG.uber.tarifaBase;
    await guardarSeccionConfiguracion(
      "uberConfig",
      {
        tarifaBase: antes + 50,
        costoKm: COSTOS_CONFIG.uber.costoKm,
        costoMinuto: COSTOS_CONFIG.uber.costoMinuto,
        costoAdministrativoManual: COSTOS_CONFIG.uber.costoAdministrativoManual,
        supuestoCasetas: COSTOS_CONFIG.uber.supuestoCasetas,
        factorDemanda: PARAMS_CONFIG.factorDemandaUber,
        rangosPico: PARAMS_CONFIG.factorDemandaUber.rangosPico,
      },
      ADMIN_ID
    );

    expect(COSTOS_CONFIG.uber.tarifaBase).toBe(antes + 50);

    // servicioCostos (Chunk 4) lee COSTOS_CONFIG.uber en cada llamada: el nuevo costo debe reflejarse de inmediato.
    const costo = calcularCostoUber({ km: 10, duracionMinutos: 20 });
    expect(costo.desglose.tarifaBase).toBe(antes + 50);
  });

  it("valida los pesos del motor de asignación (deben sumar 100%)", async () => {
    const resultado = await guardarSeccionConfiguracion(
      "asignacionPesos",
      { ...ASIGNACION_CONFIG.pesos, compatibilidad: 0.9 },
      ADMIN_ID
    );
    expect(esResultadoSinDatos(resultado)).toBe(true);
    // El valor inválido no debe haberse aplicado.
    expect(ASIGNACION_CONFIG.pesos.compatibilidad).not.toBe(0.9);
  });

  it("acepta pesos de asignación válidos que sí suman 100%", async () => {
    const nuevosPesos = {
      compatibilidad: 0.3,
      proximidad: 0.2,
      utilizacion: 0.2,
      balanceKilometraje: 0.1,
      riesgoMantenimiento: 0.1,
      incidencias: 0.1,
    };
    const resultado = await guardarSeccionConfiguracion("asignacionPesos", nuevosPesos, ADMIN_ID);
    expect(esResultadoSinDatos(resultado)).toBe(false);
    expect(ASIGNACION_CONFIG.pesos.compatibilidad).toBe(0.3);
  });

  it("valida que la hora de inicio sea menor a la hora de fin", async () => {
    const resultado = await guardarSeccionConfiguracion(
      "horarioLaboral",
      { horaInicio: 20, horaFin: 8, diasLaborales: [1, 2, 3, 4, 5] } satisfies ValorHorarioLaboral,
      ADMIN_ID
    );
    expect(esResultadoSinDatos(resultado)).toBe(true);
  });

  it("registra en RegistroAuditoria quién cambió qué campo, de qué valor a qué valor", async () => {
    const antes = PARAMS_CONFIG.limitesCostoEspecial.colaborador;
    await guardarSeccionConfiguracion(
      "limitesCostoEspecial",
      { ...PARAMS_CONFIG.limitesCostoEspecial, colaborador: antes + 100 },
      ADMIN_ID
    );

    const auditorias = await db.registrosAuditoria.where("entidadId").equals("limitesCostoEspecial").toArray();
    expect(auditorias.length).toBeGreaterThan(0);
    const cambio = auditorias.find((a) => JSON.parse(a.cambiosJson).campo === "colaborador");
    expect(cambio).toBeDefined();
    expect(cambio?.usuarioId).toBe(ADMIN_ID);
    const detalle = JSON.parse(cambio!.cambiosJson);
    expect(detalle.valorAnterior).toBe(antes);
    expect(detalle.valorNuevo).toBe(antes + 100);
  });

  it("no crea registros de auditoría cuando el valor guardado es idéntico al anterior", async () => {
    const valorActual = { ...PARAMS_CONFIG.limitesCostoEspecial };
    await guardarSeccionConfiguracion("limitesCostoEspecial", valorActual, ADMIN_ID);
    const auditorias = await db.registrosAuditoria.where("entidadId").equals("limitesCostoEspecial").toArray();
    expect(auditorias.length).toBe(0);
  });

  it("permite agregar un nuevo territorio y queda disponible para las demás vistas", async () => {
    const antes = { ...PARAMS_CONFIG.territorios };
    const resultado = await guardarSeccionConfiguracion(
      "territorios",
      { ...antes, "territorio-nuevo-leon": { nombre: "Nuevo León", latitud: 25.67, longitud: -100.31 } },
      ADMIN_ID
    );
    expect(esResultadoSinDatos(resultado)).toBe(false);
    expect(PARAMS_CONFIG.territorios["territorio-nuevo-leon" as keyof typeof PARAMS_CONFIG.territorios]).toBeDefined();
  });
});

describe("restablecerConfiguracionADefecto", () => {
  it("restaura los valores de fábrica en memoria y borra los overrides persistidos", async () => {
    await sincronizarConfiguracionPersistida();
    const original = PARAMS_CONFIG.horarioLaboral.horaInicio;

    await guardarSeccionConfiguracion(
      "horarioLaboral",
      { horaInicio: 5, horaFin: 22, diasLaborales: [0, 1, 2, 3, 4, 5, 6] } satisfies ValorHorarioLaboral,
      ADMIN_ID
    );
    expect(PARAMS_CONFIG.horarioLaboral.horaInicio).toBe(5);

    await restablecerConfiguracionADefecto();

    expect(PARAMS_CONFIG.horarioLaboral.horaInicio).toBe(original);
    expect(await db.parametrosOperativos.count()).toBe(0);
  });
});
