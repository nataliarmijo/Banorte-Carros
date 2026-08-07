/**
 * Adaptador para /incidencias (rol Admin Flota): arma el listado y el
 * detalle/bitácora de cada incidencia (creadas manualmente o generadas
 * automáticamente por el check-out del Chunk 10/11), y expone las acciones
 * de administración (crear, comentar en bitácora, asignar responsable,
 * cambiar de estatus). También calcula la tasa de incidencias por cada 100
 * viajes que usará el dashboard ejecutivo (Chunk 15).
 */

import { db } from "@/lib/repositories/dexie";
import { incidenciasRepository, registrosAuditoriaRepository } from "@/lib/repositories/typed-repositories";
import type { EntradaBitacora, EstadoIncidencia, Incidencia, NivelPrioridad, Solicitud, TipoIncidencia, Vehiculo } from "@/lib/models";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { calcularIncidenciasPorCadaCienViajes, type TasaIncidencias } from "@/lib/services/servicio-incidencias";
import { esIncidenciaAbierta } from "@/lib/ui/incidencias";
import { crearResultadoSinDatos } from "@/lib/services/types";
import type { ResultadoSinDatos } from "@/lib/services/types";
import { notificarIncidenciaCritica } from "@/lib/adapters/notificaciones";

function nombreTerritorio(territorioId: string): string {
  const territorio = PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios];
  return territorio?.nombre ?? territorioId;
}

interface ContextoEnriquecimiento {
  vehiculoPorId: Map<string, Vehiculo>;
  solicitudPorReservacion: Map<string, Solicitud>;
  nombrePorUsuario: Map<string, string>;
}

async function construirContexto(): Promise<ContextoEnriquecimiento> {
  const [vehiculos, reservaciones, usuarios] = await Promise.all([db.vehiculos.toArray(), db.reservaciones.toArray(), db.usuarios.toArray()]);

  const vehiculoPorId = new Map(vehiculos.map((v) => [v.id, v]));
  const nombrePorUsuario = new Map(usuarios.map((u) => [u.id, u.nombreCompleto]));

  const solicitudIds = [...new Set(reservaciones.map((r) => r.solicitudId))];
  const solicitudes = await Promise.all(solicitudIds.map((id) => db.solicitudes.get(id)));
  const solicitudPorId = new Map(solicitudes.filter((s): s is Solicitud => Boolean(s)).map((s) => [s.id, s]));
  const solicitudPorReservacion = new Map(
    reservaciones.flatMap((r) => {
      const solicitud = solicitudPorId.get(r.solicitudId);
      return solicitud ? [[r.id, solicitud] as const] : [];
    })
  );

  return { vehiculoPorId, solicitudPorReservacion, nombrePorUsuario };
}

export interface IncidenciaListItem {
  incidencia: Incidencia;
  vehiculo: Vehiculo | null;
  territorioNombre: string;
  folioSolicitud: string | null;
  responsableNombre: string | null;
  reportadoPorNombre: string;
}

function enriquecerIncidencia(incidencia: Incidencia, ctx: ContextoEnriquecimiento): IncidenciaListItem {
  const vehiculo = ctx.vehiculoPorId.get(incidencia.vehiculoId) ?? null;
  const solicitud = incidencia.reservacionId ? ctx.solicitudPorReservacion.get(incidencia.reservacionId) : undefined;

  return {
    incidencia,
    vehiculo,
    territorioNombre: vehiculo ? nombreTerritorio(vehiculo.territorioId) : "Territorio desconocido",
    folioSolicitud: solicitud?.folio ?? null,
    responsableNombre: incidencia.responsableId ? (ctx.nombrePorUsuario.get(incidencia.responsableId) ?? null) : null,
    reportadoPorNombre: ctx.nombrePorUsuario.get(incidencia.usuarioReportaId) ?? "Usuario desconocido",
  };
}

export async function listarIncidencias(): Promise<IncidenciaListItem[]> {
  const [incidencias, ctx] = await Promise.all([db.incidencias.toArray(), construirContexto()]);
  return incidencias
    .map((incidencia) => enriquecerIncidencia(incidencia, ctx))
    .sort((a, b) => b.incidencia.fechaCreacion.localeCompare(a.incidencia.fechaCreacion));
}

/** Incidencias Críticas todavía abiertas/en proceso; alimenta la alerta del header para Admin Flota. */
export async function listarIncidenciasCriticasAbiertas(): Promise<IncidenciaListItem[]> {
  const items = await listarIncidencias();
  return items.filter((i) => i.incidencia.severidad === "CRITICA" && esIncidenciaAbierta(i.incidencia.estadoIncidencia));
}

export interface EntradaBitacoraEnriquecida extends EntradaBitacora {
  usuarioNombre: string;
}

export interface DetalleIncidencia extends IncidenciaListItem {
  bitacora: EntradaBitacoraEnriquecida[];
}

export async function obtenerDetalleIncidencia(id: string): Promise<DetalleIncidencia | null> {
  const incidencia = await incidenciasRepository.getById(id);
  if (!incidencia) return null;

  const ctx = await construirContexto();
  const base = enriquecerIncidencia(incidencia, ctx);
  const bitacora = [...incidencia.bitacora]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((entrada) => ({ ...entrada, usuarioNombre: ctx.nombrePorUsuario.get(entrada.usuarioId) ?? "Usuario desconocido" }));

  return { ...base, bitacora };
}

async function registrarAuditoria(entidadId: string, usuarioId: string, accion: string, cambios: Record<string, unknown>): Promise<void> {
  const ahora = new Date().toISOString();
  await registrosAuditoriaRepository.create({
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioId,
    estatus: "ACTIVO",
    entidad: "Incidencia",
    entidadId,
    accion,
    usuarioId,
    cambiosJson: JSON.stringify(cambios),
    fechaCambio: ahora,
  });
}

export interface DatosIncidenciaManual {
  tipoIncidencia: TipoIncidencia;
  severidad: NivelPrioridad;
  vehiculoId: string;
  reservacionId?: string;
  descripcion: string;
  fotos: string[];
  responsableId?: string;
  fechaCompromiso?: string;
}

/** Crea una incidencia manualmente (Admin Flota); las automáticas del check-out se crean en lib/adapters/checkout.ts. */
export async function crearIncidenciaManual(datos: DatosIncidenciaManual, usuarioId: string): Promise<Incidencia | ResultadoSinDatos> {
  if (datos.descripcion.trim().length === 0) {
    return crearResultadoSinDatos("Describe la incidencia.");
  }
  const vehiculo = await db.vehiculos.get(datos.vehiculoId);
  if (!vehiculo) {
    return crearResultadoSinDatos("Selecciona un vehículo válido.");
  }

  const ahora = new Date().toISOString();
  const incidencia: Incidencia = {
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioId,
    estatus: "ACTIVO",
    reservacionId: datos.reservacionId || undefined,
    vehiculoId: datos.vehiculoId,
    usuarioReportaId: usuarioId,
    tipoIncidencia: datos.tipoIncidencia,
    severidad: datos.severidad,
    descripcion: datos.descripcion.trim(),
    fotos: datos.fotos,
    responsableId: datos.responsableId || undefined,
    fechaCompromiso: datos.fechaCompromiso || undefined,
    bitacora: [{ id: crypto.randomUUID(), fecha: ahora, usuarioId, comentario: `Incidencia registrada: ${datos.descripcion.trim()}` }],
    estadoIncidencia: "ABIERTA",
  };
  await incidenciasRepository.create(incidencia);
  await registrarAuditoria(incidencia.id, usuarioId, "CREAR", { tipoIncidencia: incidencia.tipoIncidencia, severidad: incidencia.severidad });

  if (incidencia.severidad === "CRITICA") {
    const vehiculoNombre = `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})`;
    const adminsFlota = await db.usuarios.where("rol").equals("ADMIN_FLOTA").toArray();
    await Promise.all(adminsFlota.map((admin) => notificarIncidenciaCritica(admin.id, incidencia.descripcion, vehiculoNombre)));
  }

  return incidencia;
}

export async function agregarComentarioBitacora(incidenciaId: string, comentario: string, usuarioId: string): Promise<Incidencia | ResultadoSinDatos> {
  if (comentario.trim().length === 0) {
    return crearResultadoSinDatos("Escribe un comentario para agregarlo a la bitácora.");
  }
  const existente = await incidenciasRepository.getById(incidenciaId);
  if (!existente) return crearResultadoSinDatos(`No existe la incidencia ${incidenciaId}`);

  const ahora = new Date().toISOString();
  const entrada: EntradaBitacora = { id: crypto.randomUUID(), fecha: ahora, usuarioId, comentario: comentario.trim() };
  const actualizada = await incidenciasRepository.update(incidenciaId, {
    bitacora: [...existente.bitacora, entrada],
    fechaActualizacion: ahora,
  });
  if (!actualizada) return crearResultadoSinDatos(`No se pudo actualizar la incidencia ${incidenciaId}`);
  return actualizada as Incidencia;
}

export async function asignarResponsable(incidenciaId: string, responsableId: string, usuarioId: string): Promise<Incidencia | ResultadoSinDatos> {
  const existente = await incidenciasRepository.getById(incidenciaId);
  if (!existente) return crearResultadoSinDatos(`No existe la incidencia ${incidenciaId}`);
  const responsable = await db.usuarios.get(responsableId);
  if (!responsable) return crearResultadoSinDatos("Selecciona un responsable válido.");

  const ahora = new Date().toISOString();
  const entrada: EntradaBitacora = {
    id: crypto.randomUUID(),
    fecha: ahora,
    usuarioId,
    comentario: `Responsable asignado: ${responsable.nombreCompleto}`,
  };
  const actualizada = await incidenciasRepository.update(incidenciaId, {
    responsableId,
    bitacora: [...existente.bitacora, entrada],
    fechaActualizacion: ahora,
  });
  if (!actualizada) return crearResultadoSinDatos(`No se pudo actualizar la incidencia ${incidenciaId}`);

  await registrarAuditoria(incidenciaId, usuarioId, "ASIGNAR_RESPONSABLE", { responsableId });
  return actualizada as Incidencia;
}

const ETIQUETA_ESTADO_TRANSICION: Record<EstadoIncidencia, string> = {
  ABIERTA: "Abierta",
  EN_PROCESO: "En proceso",
  RESUELTA: "Resuelta",
  CERRADA: "Cerrada",
};

/**
 * Cambia el estatus de la incidencia. Exige comentario al marcarla Resuelta
 * o Cerrada (confirmación/justificación del cierre) y lo deja en la
 * bitácora.
 */
export async function cambiarEstadoIncidencia(
  incidenciaId: string,
  nuevoEstado: EstadoIncidencia,
  usuarioId: string,
  comentario: string
): Promise<Incidencia | ResultadoSinDatos> {
  const requiereComentario = nuevoEstado === "RESUELTA" || nuevoEstado === "CERRADA";
  if (requiereComentario && comentario.trim().length === 0) {
    return crearResultadoSinDatos(`Escribe un comentario para marcar la incidencia como "${ETIQUETA_ESTADO_TRANSICION[nuevoEstado]}".`);
  }

  const existente = await incidenciasRepository.getById(incidenciaId);
  if (!existente) return crearResultadoSinDatos(`No existe la incidencia ${incidenciaId}`);
  if (existente.estadoIncidencia === nuevoEstado) {
    return crearResultadoSinDatos(`La incidencia ya está "${ETIQUETA_ESTADO_TRANSICION[nuevoEstado]}".`);
  }

  const ahora = new Date().toISOString();
  const detalleComentario = comentario.trim() || `Cambió de "${ETIQUETA_ESTADO_TRANSICION[existente.estadoIncidencia]}" a "${ETIQUETA_ESTADO_TRANSICION[nuevoEstado]}".`;
  const entrada: EntradaBitacora = {
    id: crypto.randomUUID(),
    fecha: ahora,
    usuarioId,
    comentario: `[${ETIQUETA_ESTADO_TRANSICION[existente.estadoIncidencia]} → ${ETIQUETA_ESTADO_TRANSICION[nuevoEstado]}] ${detalleComentario}`,
  };

  const actualizada = await incidenciasRepository.update(incidenciaId, {
    estadoIncidencia: nuevoEstado,
    bitacora: [...existente.bitacora, entrada],
    fechaActualizacion: ahora,
  });
  if (!actualizada) return crearResultadoSinDatos(`No se pudo actualizar la incidencia ${incidenciaId}`);

  await registrarAuditoria(incidenciaId, usuarioId, "CAMBIO_ESTATUS", {
    estadoAnterior: existente.estadoIncidencia,
    estadoNuevo: nuevoEstado,
    comentario: comentario.trim(),
  });
  return actualizada as Incidencia;
}

/** Incidencias por cada 100 viajes completados; insumo del dashboard ejecutivo (Chunk 15). */
export async function obtenerTasaIncidenciasPorCadaCienViajes(): Promise<TasaIncidencias> {
  const [totalIncidencias, totalViajes] = await Promise.all([
    db.incidencias.count(),
    db.reservaciones.where("estadoReservacion").equals("COMPLETADA").count(),
  ]);
  return calcularIncidenciasPorCadaCienViajes(totalIncidencias, totalViajes);
}
