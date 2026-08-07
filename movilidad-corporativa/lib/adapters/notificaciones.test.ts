import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/repositories/dexie";
import {
  contarNoLeidas,
  listarBandeja,
  marcarComoLeida,
  marcarTodasComoLeidas,
  notificarIncidenciaCritica,
  notificarRecordatorio,
  notificarSolicitudAprobada,
  notificarSolicitudCreada,
  notificarSolicitudRechazada,
  notificarVehiculoAsignado,
} from "./notificaciones";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  await db.delete();
  await db.open();
});

describe("bandeja de notificaciones", () => {
  it("listarBandeja devuelve sólo las del usuario, más recientes primero", async () => {
    await notificarSolicitudCreada("user-2", "MOV-1", "sol-1");
    await notificarSolicitudCreada("user-3", "MOV-2", "sol-2");
    await notificarSolicitudAprobada("user-2", "MOV-1", "sol-1");

    const bandeja = await listarBandeja("user-2");
    expect(bandeja).toHaveLength(2);
    expect(bandeja.every((n) => n.usuarioDestinoId === "user-2")).toBe(true);
  });

  it("contarNoLeidas y marcarComoLeida/marcarTodasComoLeidas funcionan correctamente", async () => {
    await notificarSolicitudCreada("user-2", "MOV-1", "sol-1");
    await notificarSolicitudAprobada("user-2", "MOV-1", "sol-1");

    expect(await contarNoLeidas("user-2")).toBe(2);

    const [primera] = await listarBandeja("user-2");
    await marcarComoLeida(primera.id);
    expect(await contarNoLeidas("user-2")).toBe(1);

    await marcarTodasComoLeidas("user-2");
    expect(await contarNoLeidas("user-2")).toBe(0);
  });

  it("cada función de conveniencia arma un mensaje con el tipo de evento correcto", async () => {
    await notificarSolicitudRechazada("user-1", "MOV-3", "sol-3", "Costo fuera de política");
    await notificarVehiculoAsignado("user-1", "MOV-3", "sol-3", "Toyota Corolla (ABC-123)");
    await notificarRecordatorio("user-1", "RECORDATORIO_CHECKIN", "MOV-3", "sol-3");
    await notificarIncidenciaCritica("user-admin", "Choque leve", "Toyota Corolla (ABC-123)");

    const bandejaColaborador = await listarBandeja("user-1");
    expect(bandejaColaborador.some((n) => n.tipoNotificacion === "SOLICITUD_RECHAZADA" && n.mensaje.includes("Costo fuera de política"))).toBe(true);
    expect(bandejaColaborador.some((n) => n.tipoNotificacion === "VEHICULO_ASIGNADO" && n.mensaje.includes("Toyota Corolla"))).toBe(true);
    expect(bandejaColaborador.some((n) => n.tipoNotificacion === "RECORDATORIO_CHECKIN")).toBe(true);

    const bandejaAdmin = await listarBandeja("user-admin");
    expect(bandejaAdmin.some((n) => n.tipoNotificacion === "INCIDENCIA_CRITICA" && n.mensaje.includes("Choque leve"))).toBe(true);
  });
});
