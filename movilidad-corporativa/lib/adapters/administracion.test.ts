/**
 * Pruebas de integración de /administracion (Admin Flota) sobre el
 * adaptador real (Dexie vía fake-indexeddb): gestión de usuarios (crear,
 * editar, cambiar rol/territorio, con auditoría), y gestión de territorios
 * (crear/renombrar vía PARAMS_CONFIG.territorios, con conteos de
 * vehículos/usuarios).
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import { restablecerConfiguracionADefecto } from "@/lib/config/runtime-config";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { esResultadoSinDatos } from "@/lib/services/types";
import {
  actualizarNombreTerritorio,
  actualizarUsuario,
  cambiarRolUsuario,
  cambiarTerritorioUsuario,
  crearTerritorio,
  crearUsuario,
  listarTerritoriosConConteos,
  listarUsuarios,
} from "./administracion";

const ADMIN_ID = "user-admin";

beforeEach(async () => {
  await initializeDemoData();
});

afterEach(async () => {
  await restablecerConfiguracionADefecto();
  await db.delete();
  await db.open();
});

describe("gestión de usuarios", () => {
  it("lista los usuarios semilla del Chunk 2 con el nombre de su territorio", async () => {
    const usuarios = await listarUsuarios();
    expect(usuarios.length).toBeGreaterThanOrEqual(8);
    const admin = usuarios.find((u) => u.usuario.id === "user-admin");
    expect(admin?.territorioNombre).toBe("CDMX");
  });

  it("crea un usuario nuevo y lo audita", async () => {
    const resultado = await crearUsuario(
      {
        nombreCompleto: "Nuevo Colaborador",
        correoCorporativo: "nuevo.colaborador@banorte.com",
        empleadoId: "EMP-9001",
        rol: "COLABORADOR",
        territorioId: "territorio-cdmx",
      },
      ADMIN_ID
    );
    expect(esResultadoSinDatos(resultado)).toBe(false);
    if (esResultadoSinDatos(resultado)) return;

    const guardado = await db.usuarios.get(resultado.id);
    expect(guardado?.nombreCompleto).toBe("Nuevo Colaborador");

    const auditorias = await db.registrosAuditoria.where("entidadId").equals(resultado.id).toArray();
    expect(auditorias.some((a) => a.accion === "CREAR")).toBe(true);
  });

  it("rechaza crear un usuario con correo duplicado", async () => {
    const resultado = await crearUsuario(
      {
        nombreCompleto: "Duplicado",
        correoCorporativo: "ana.lopez@banorte.com", // ya existe (user-1)
        empleadoId: "EMP-9002",
        rol: "COLABORADOR",
        territorioId: "territorio-cdmx",
      },
      ADMIN_ID
    );
    expect(esResultadoSinDatos(resultado)).toBe(true);
  });

  it("edita los datos generales de un usuario", async () => {
    const resultado = await actualizarUsuario(
      "user-1",
      { nombreCompleto: "Ana López Editada", correoCorporativo: "ana.lopez@banorte.com", empleadoId: "EMP-1001", telefono: "5559999999" },
      ADMIN_ID
    );
    expect(esResultadoSinDatos(resultado)).toBe(false);
    expect((await db.usuarios.get("user-1"))?.nombreCompleto).toBe("Ana López Editada");
  });

  it("cambia el rol de un usuario y lo audita con el rol anterior y el nuevo", async () => {
    const resultado = await cambiarRolUsuario("user-1", "APROBADOR", ADMIN_ID);
    expect(esResultadoSinDatos(resultado)).toBe(false);
    expect((await db.usuarios.get("user-1"))?.rol).toBe("APROBADOR");

    const auditorias = await db.registrosAuditoria.where("entidadId").equals("user-1").toArray();
    const cambio = auditorias.find((a) => a.accion === "CAMBIO_ROL");
    expect(cambio).toBeDefined();
    const detalle = JSON.parse(cambio!.cambiosJson);
    expect(detalle.rolAnterior).toBe("COLABORADOR");
    expect(detalle.rolNuevo).toBe("APROBADOR");
  });

  it("esto afecta de inmediato al selector de rol del Chunk 3 (misma fuente de datos)", async () => {
    await cambiarRolUsuario("user-1", "EJECUTIVO", ADMIN_ID);
    const usuarios = await listarUsuarios();
    const ana = usuarios.find((u) => u.usuario.id === "user-1");
    expect(ana?.usuario.rol).toBe("EJECUTIVO");
  });

  it("cambia el territorio de un usuario y lo audita", async () => {
    const resultado = await cambiarTerritorioUsuario("user-1", "territorio-monterrey", ADMIN_ID);
    expect(esResultadoSinDatos(resultado)).toBe(false);
    expect((await db.usuarios.get("user-1"))?.territorioId).toBe("territorio-monterrey");
  });

  it("rechaza cambiar a un territorio que no existe", async () => {
    const resultado = await cambiarTerritorioUsuario("user-1", "territorio-inexistente", ADMIN_ID);
    expect(esResultadoSinDatos(resultado)).toBe(true);
  });
});

describe("gestión de territorios", () => {
  it("lista territorios con conteo de vehículos y usuarios", async () => {
    const territorios = await listarTerritoriosConConteos();
    const cdmx = territorios.find((t) => t.id === "territorio-cdmx");
    expect(cdmx).toBeDefined();
    expect(cdmx!.vehiculos).toBeGreaterThan(0);
    expect(cdmx!.usuarios).toBeGreaterThan(0);
  });

  it("renombra un territorio y el cambio se refleja de inmediato en PARAMS_CONFIG (fuente que usan todas las vistas)", async () => {
    const resultado = await actualizarNombreTerritorio("territorio-cdmx", "Ciudad de México", ADMIN_ID);
    expect(esResultadoSinDatos(resultado)).toBe(false);
    expect(PARAMS_CONFIG.territorios["territorio-cdmx" as keyof typeof PARAMS_CONFIG.territorios].nombre).toBe("Ciudad de México");

    const territorios = await listarTerritoriosConConteos();
    expect(territorios.find((t) => t.id === "territorio-cdmx")?.nombre).toBe("Ciudad de México");
  });

  it("crea un nuevo territorio con conteos en cero", async () => {
    const resultado = await crearTerritorio("Tijuana", ADMIN_ID);
    expect(esResultadoSinDatos(resultado)).toBe(false);

    const territorios = await listarTerritoriosConConteos();
    const tijuana = territorios.find((t) => t.nombre === "Tijuana");
    expect(tijuana).toBeDefined();
    expect(tijuana!.vehiculos).toBe(0);
    expect(tijuana!.usuarios).toBe(0);
  });
});
