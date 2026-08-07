import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/repositories/dexie";
import { ProveedorCorreoMock, ProveedorNotificacionesMock } from "./notificaciones";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  await db.delete();
  await db.open();
});

describe("ProveedorCorreoMock", () => {
  it("declara esReal: false y no lanza al 'enviar'", async () => {
    const proveedor = new ProveedorCorreoMock();
    expect(proveedor.meta.esReal).toBe(false);
    const envio = await proveedor.enviarCorreo("ana.lopez@banorte.com", "Asunto", "Cuerpo");
    expect(envio.esSimulado).toBe(true);
    expect(envio.canal).toBe("EMAIL");
  });
});

describe("ProveedorNotificacionesMock", () => {
  it("persiste la notificación en db.notificaciones (bandeja visible)", async () => {
    const proveedor = new ProveedorNotificacionesMock();
    await proveedor.notificar({
      usuarioDestinoId: "user-1",
      tipo: "SOLICITUD_APROBADA",
      solicitudId: "sol-1",
      mensaje: "Tu solicitud fue aprobada.",
    });

    const notificaciones = await db.notificaciones.where("usuarioDestinoId").equals("user-1").toArray();
    expect(notificaciones).toHaveLength(1);
    expect(notificaciones[0].tipoNotificacion).toBe("SOLICITUD_APROBADA");
    expect(notificaciones[0].leida).toBe(false);
  });

  it("llama al proveedor de correo inyectado", async () => {
    const correoMock = { meta: { nombre: "test", esReal: false }, enviarCorreo: vi.fn().mockResolvedValue({ id: "1", fechaEnvio: "now", canal: "EMAIL", esSimulado: true }) };
    const proveedor = new ProveedorNotificacionesMock(correoMock);
    await proveedor.notificar({ usuarioDestinoId: "user-1", tipo: "VEHICULO_ASIGNADO", mensaje: "Vehículo asignado." });
    expect(correoMock.enviarCorreo).toHaveBeenCalledTimes(1);
  });

  it("usa '' como solicitudId cuando no se especifica (p. ej. incidencia crítica)", async () => {
    const proveedor = new ProveedorNotificacionesMock();
    await proveedor.notificar({ usuarioDestinoId: "user-admin", tipo: "INCIDENCIA_CRITICA", mensaje: "Accidente reportado." });
    const notificaciones = await db.notificaciones.where("usuarioDestinoId").equals("user-admin").toArray();
    expect(notificaciones[0].solicitudId).toBe("");
  });
});
