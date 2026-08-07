import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData } from "@/lib/seed/init";
import { ProveedorSSOMock } from "./sso";

const proveedor = new ProveedorSSOMock();

beforeEach(async () => {
  await initializeDemoData();
});

afterEach(async () => {
  await db.delete();
  await db.open();
});

describe("ProveedorSSOMock", () => {
  it("declara esReal: false", () => {
    expect(proveedor.meta.esReal).toBe(false);
  });

  it("resuelve con el usuario indicado, ya sembrado en Dexie", async () => {
    const usuario = await proveedor.iniciarSesion("user-1");
    expect(usuario?.id).toBe("user-1");
    expect(usuario?.esSimulado).toBe(true);
  });

  it("sin usuarioId, resuelve con el primer Admin Flota sembrado", async () => {
    const usuario = await proveedor.iniciarSesion();
    expect(usuario?.rol).toBe("ADMIN_FLOTA");
  });

  it("devuelve null si el usuario no existe", async () => {
    const usuario = await proveedor.iniciarSesion("usuario-inexistente");
    expect(usuario).toBeNull();
  });

  it("cerrarSesion no revienta (no-op)", async () => {
    await expect(proveedor.cerrarSesion()).resolves.toBeUndefined();
  });
});
