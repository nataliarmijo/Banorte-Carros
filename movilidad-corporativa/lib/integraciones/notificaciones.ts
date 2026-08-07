/**
 * IProveedorCorreo / IProveedorNotificaciones — envío de correos y
 * notificaciones en eventos clave (solicitud creada, aprobada/rechazada,
 * vehículo asignado, recordatorio de check-in/check-out, incidencia
 * crítica).
 *
 * El mock de notificaciones SÍ persiste (en `db.notificaciones`, la tabla
 * que ya existía desde el Chunk 2 pero que nadie llenaba en eventos reales)
 * para alimentar una bandeja interna visible en toda la app — ver el ícono
 * de campana en components/bandeja-notificaciones.tsx. El mock de correo NO
 * persiste ni envía nada: sólo registra en consola que "se hubiera
 * enviado" un correo, y ambos exponen `meta.esReal = false`.
 *
 * Implementación real futura: sustituir `ProveedorCorreoMock` por un
 * adaptador a un proveedor de correo transaccional (SendGrid, SES, etc.) y
 * `ProveedorNotificacionesMock` por uno que además dispare push/SMS. Ver
 * /lib/integraciones/README.md.
 */

import { notificacionesRepository } from "@/lib/repositories/typed-repositories";
import type { MetaProveedor } from "./tipos";

export type TipoNotificacionEvento =
  | "SOLICITUD_CREADA"
  | "SOLICITUD_APROBADA"
  | "SOLICITUD_RECHAZADA"
  | "SOLICITUD_CAMBIOS"
  | "VEHICULO_ASIGNADO"
  | "RECORDATORIO_CHECKIN"
  | "RECORDATORIO_CHECKOUT"
  | "INCIDENCIA_CRITICA";

export interface DatosNotificacion {
  usuarioDestinoId: string;
  tipo: TipoNotificacionEvento;
  mensaje: string;
  /** Solicitud relacionada, cuando aplica (el modelo Notificacion del Chunk 2 la requiere; se guarda "" si no aplica, p. ej. una incidencia). */
  solicitudId?: string;
  canalPreferido?: "EMAIL" | "PUSH" | "SMS";
}

export interface EnvioNotificacion {
  id: string;
  fechaEnvio: string;
  canal: string;
  esSimulado: boolean;
}

export interface IProveedorCorreo {
  meta: MetaProveedor;
  enviarCorreo(destinatarioCorreo: string, asunto: string, cuerpo: string): Promise<EnvioNotificacion>;
}

export interface IProveedorNotificaciones {
  meta: MetaProveedor;
  /** Registra la notificación (queda visible en la bandeja) y "envía" el correo correspondiente. */
  notificar(datos: DatosNotificacion): Promise<EnvioNotificacion>;
}

export class ProveedorCorreoMock implements IProveedorCorreo {
  meta: MetaProveedor = {
    nombre: "Mock interno de correo",
    esReal: false,
    notaSimulacion: "No se envía ningún correo real; sólo queda un registro en consola y en la bandeja de notificaciones.",
  };

  async enviarCorreo(destinatarioCorreo: string, asunto: string, cuerpo: string): Promise<EnvioNotificacion> {
    // Sustituye al envío real mientras no haya un proveedor de correo conectado.
    console.info(`[Correo simulado] Para: ${destinatarioCorreo} · Asunto: ${asunto} · ${cuerpo}`);
    return { id: crypto.randomUUID(), fechaEnvio: new Date().toISOString(), canal: "EMAIL", esSimulado: true };
  }
}

export class ProveedorNotificacionesMock implements IProveedorNotificaciones {
  meta: MetaProveedor = {
    nombre: "Mock interno de notificaciones",
    esReal: false,
    notaSimulacion: "Las notificaciones sólo quedan registradas en esta sesión del navegador (Dexie), no se envían push/SMS reales.",
  };

  constructor(private readonly proveedorCorreo: IProveedorCorreo = new ProveedorCorreoMock()) {}

  async notificar(datos: DatosNotificacion): Promise<EnvioNotificacion> {
    const ahora = new Date().toISOString();
    await notificacionesRepository.create({
      id: crypto.randomUUID(),
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
      usuarioCreadorId: "sistema",
      estatus: "ACTIVO",
      usuarioDestinoId: datos.usuarioDestinoId,
      solicitudId: datos.solicitudId ?? "",
      tipoNotificacion: datos.tipo,
      mensaje: datos.mensaje,
      leida: false,
      canal: datos.canalPreferido ?? "EMAIL",
    });

    return this.proveedorCorreo.enviarCorreo(datos.usuarioDestinoId, datos.tipo, datos.mensaje);
  }
}

export const proveedorNotificaciones: IProveedorNotificaciones = new ProveedorNotificacionesMock();
