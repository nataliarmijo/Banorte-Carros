/**
 * Adaptador de notificaciones: bandeja interna (lectura/marcar leída) y
 * funciones de conveniencia por evento, cada una construyendo el mensaje y
 * llamando a `proveedorNotificaciones` (/lib/integraciones/notificaciones.ts).
 * Los adaptadores de negocio (solicitudes, aprobaciones, incidencias,
 * operación) llaman a estas funciones en vez de tocar el proveedor
 * directamente, para mantener los mensajes consistentes en un solo lugar.
 */

import { db } from "@/lib/repositories/dexie";
import { notificacionesRepository } from "@/lib/repositories/typed-repositories";
import type { Notificacion } from "@/lib/models";
import { proveedorNotificaciones } from "@/lib/integraciones/notificaciones";

export async function listarBandeja(usuarioId: string, limite = 30): Promise<Notificacion[]> {
  const notificaciones = await db.notificaciones.where("usuarioDestinoId").equals(usuarioId).toArray();
  return notificaciones.sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)).slice(0, limite);
}

export async function contarNoLeidas(usuarioId: string): Promise<number> {
  const notificaciones = await db.notificaciones.where("usuarioDestinoId").equals(usuarioId).toArray();
  return notificaciones.filter((n) => !n.leida).length;
}

export async function marcarComoLeida(id: string): Promise<void> {
  await notificacionesRepository.update(id, { leida: true, fechaActualizacion: new Date().toISOString() });
}

export async function marcarTodasComoLeidas(usuarioId: string): Promise<void> {
  const pendientes = await db.notificaciones.where("usuarioDestinoId").equals(usuarioId).toArray();
  await Promise.all(pendientes.filter((n) => !n.leida).map((n) => marcarComoLeida(n.id)));
}

// ---------------------------------------------------------------------------
// Conveniencia por evento (usadas desde los adaptadores de negocio)
// ---------------------------------------------------------------------------

export async function notificarSolicitudCreada(usuarioDestinoId: string, folio: string, solicitudId: string): Promise<void> {
  await proveedorNotificaciones.notificar({
    usuarioDestinoId,
    tipo: "SOLICITUD_CREADA",
    solicitudId,
    mensaje: `Tienes una nueva solicitud ${folio} pendiente de aprobación.`,
  });
}

export async function notificarSolicitudAprobada(usuarioDestinoId: string, folio: string, solicitudId: string, detalle?: string): Promise<void> {
  await proveedorNotificaciones.notificar({
    usuarioDestinoId,
    tipo: "SOLICITUD_APROBADA",
    solicitudId,
    mensaje: detalle ? `Tu solicitud ${folio} fue aprobada. ${detalle}` : `Tu solicitud ${folio} fue aprobada.`,
  });
}

export async function notificarSolicitudRechazada(usuarioDestinoId: string, folio: string, solicitudId: string, motivo: string): Promise<void> {
  await proveedorNotificaciones.notificar({
    usuarioDestinoId,
    tipo: "SOLICITUD_RECHAZADA",
    solicitudId,
    mensaje: `Tu solicitud ${folio} fue rechazada: ${motivo}`,
  });
}

export async function notificarVehiculoAsignado(usuarioDestinoId: string, folio: string, solicitudId: string, vehiculoNombre: string): Promise<void> {
  await proveedorNotificaciones.notificar({
    usuarioDestinoId,
    tipo: "VEHICULO_ASIGNADO",
    solicitudId,
    mensaje: `Se asignó ${vehiculoNombre} a tu solicitud ${folio}.`,
  });
}

export async function notificarRecordatorio(
  usuarioDestinoId: string,
  tipo: "RECORDATORIO_CHECKIN" | "RECORDATORIO_CHECKOUT",
  folio: string,
  solicitudId: string
): Promise<void> {
  const accion = tipo === "RECORDATORIO_CHECKIN" ? "recoger el vehículo (check-in)" : "devolver el vehículo (check-out)";
  await proveedorNotificaciones.notificar({
    usuarioDestinoId,
    tipo,
    solicitudId,
    mensaje: `Recordatorio: tienes pendiente ${accion} de la solicitud ${folio}.`,
  });
}

export async function notificarIncidenciaCritica(usuarioDestinoId: string, descripcion: string, vehiculoNombre: string): Promise<void> {
  await proveedorNotificaciones.notificar({
    usuarioDestinoId,
    tipo: "INCIDENCIA_CRITICA",
    mensaje: `Incidencia crítica en ${vehiculoNombre}: ${descripcion}`,
  });
}
