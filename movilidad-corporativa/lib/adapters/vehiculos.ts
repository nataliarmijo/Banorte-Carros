/**
 * Adaptador para /vehiculos (catálogo editable, rol Admin Flota): arma la
 * lista enriquecida del catálogo y el detalle/historial por vehículo, y
 * expone las acciones de administración (crear, editar, bloquear/
 * desbloquear con motivo, programar mantenimiento, cambiar territorio o
 * modalidad) dejando registro en RegistroAuditoria cuando corresponde. El
 * cambio de modalidad queda auditado porque altera directamente el conteo
 * Pool/Asignado que usa el dashboard ejecutivo (Chunk 15) para medir el
 * avance hacia la meta 60/40 (ver servicioFlota.calcularComposicionFlotilla).
 */

import { db } from "@/lib/repositories/dexie";
import { mantenimientosRepository, registrosAuditoriaRepository, vehiculosRepository } from "@/lib/repositories/typed-repositories";
import type { Incidencia, Mantenimiento, ModalidadVehiculo, Reservacion, Solicitud, Vehiculo } from "@/lib/models";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { ASIGNACION_CONFIG } from "@/lib/config/asignacion";
import { fechaLocalISO } from "@/lib/adapters/operacion";
import {
  calcularComposicionFlotilla,
  calcularTendenciaUtilizacion,
  type ComposicionFlotilla,
  type PuntoTendenciaUtilizacion,
} from "@/lib/services/servicio-flota";
import { crearResultadoSinDatos } from "@/lib/services/types";
import type { ResultadoSinDatos } from "@/lib/services/types";

const SEMANAS_TENDENCIA = 6;

/** Vehículos gestionados como flotilla propia (excluye Uber, que es un servicio externo). */
export type ModalidadFlotaVehiculo = "POOL" | "ASIGNADO";

function nombreTerritorio(territorioId: string): string {
  const territorio = PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios];
  return territorio?.nombre ?? territorioId;
}

async function registrarAuditoria(entidadId: string, usuarioId: string, accion: string, cambios: Record<string, unknown>): Promise<void> {
  const ahora = new Date().toISOString();
  await registrosAuditoriaRepository.create({
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioId,
    estatus: "ACTIVO",
    entidad: "Vehiculo",
    entidadId,
    accion,
    usuarioId,
    cambiosJson: JSON.stringify(cambios),
    fechaCambio: ahora,
  });
}

// ---------------------------------------------------------------------------
// Catálogo (listado)
// ---------------------------------------------------------------------------

export interface VehiculoCatalogoItem {
  vehiculo: Vehiculo;
  territorioNombre: string;
  usuarioAsignadoNombre: string | null;
  incidenciasAbiertas: number;
  /** Viajes en la ventana reciente configurada (misma definición que usa el motor de asignación, Chunk 5). */
  viajesRecientes: number;
  factorEmisionValor: number | null;
}

export async function listarCatalogoVehiculos(): Promise<VehiculoCatalogoItem[]> {
  const [vehiculos, incidencias, reservaciones, factores, usuarios] = await Promise.all([
    db.vehiculos.toArray(),
    db.incidencias.toArray(),
    db.reservaciones.toArray(),
    db.factoresEmision.toArray(),
    db.usuarios.toArray(),
  ]);

  const factorPorId = new Map(factores.map((f) => [f.id, f.factor]));
  const nombrePorUsuario = new Map(usuarios.map((u) => [u.id, u.nombreCompleto]));
  const ahora = new Date();
  const ventanaMs = ASIGNACION_CONFIG.utilizacion.ventanaDias * 24 * 60 * 60 * 1000;

  return vehiculos.map((vehiculo) => {
    const incidenciasAbiertas = incidencias.filter((i) => i.vehiculoId === vehiculo.id && i.estadoIncidencia !== "RESUELTA").length;
    const viajesRecientes = reservaciones.filter(
      (r) => r.vehiculoId === vehiculo.id && ahora.getTime() - new Date(r.fechaInicio).getTime() <= ventanaMs
    ).length;

    return {
      vehiculo,
      territorioNombre: nombreTerritorio(vehiculo.territorioId),
      usuarioAsignadoNombre: vehiculo.usuarioAsignadoId ? (nombrePorUsuario.get(vehiculo.usuarioAsignadoId) ?? null) : null,
      incidenciasAbiertas,
      viajesRecientes,
      factorEmisionValor: factorPorId.get(vehiculo.factorEmisionId) ?? null,
    };
  });
}

/** Composición Pool/Asignado de toda la flotilla; insumo del indicador 60/40 del dashboard ejecutivo (Chunk 15). */
export async function obtenerComposicionFlotilla(): Promise<ComposicionFlotilla> {
  const vehiculos = await db.vehiculos.toArray();
  return calcularComposicionFlotilla(vehiculos);
}

// ---------------------------------------------------------------------------
// Crear / editar
// ---------------------------------------------------------------------------

export interface DatosVehiculo {
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  tipoVehiculo: string;
  modalidad: ModalidadFlotaVehiculo;
  territorioId: string;
  ubicacion: string;
  capacidadPasajeros: number;
  combustibleTipo: string;
  kilometrajeActual: number;
  rendimientoKmPorLitro: number;
  costoPorKm: number;
  usuarioAsignadoId?: string;
  proximaVerificacionFecha?: string;
}

async function existePlaca(placaNormalizada: string, idAExcluir?: string): Promise<boolean> {
  const vehiculos = await db.vehiculos.toArray();
  return vehiculos.some((v) => v.id !== idAExcluir && v.placa.trim().toUpperCase() === placaNormalizada);
}

export async function crearVehiculo(datos: DatosVehiculo, usuarioId: string): Promise<Vehiculo | ResultadoSinDatos> {
  const placaNormalizada = datos.placa.trim().toUpperCase();
  if (await existePlaca(placaNormalizada)) {
    return crearResultadoSinDatos(`Ya existe un vehículo registrado con la placa ${placaNormalizada}.`);
  }

  const ahora = new Date().toISOString();
  const vehiculo: Vehiculo = {
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioId,
    estatus: "ACTIVO",
    placa: placaNormalizada,
    marca: datos.marca,
    modelo: datos.modelo,
    anio: datos.anio,
    tipoVehiculo: datos.tipoVehiculo,
    modalidad: datos.modalidad,
    territorioId: datos.territorioId,
    ubicacion: datos.ubicacion,
    capacidadPasajeros: datos.capacidadPasajeros,
    combustibleTipo: datos.combustibleTipo,
    kilometrajeActual: datos.kilometrajeActual,
    rendimientoKmPorLitro: datos.rendimientoKmPorLitro,
    estadoOperativo: "DISPONIBLE",
    disponibilidadActual: true,
    costoPorKm: datos.costoPorKm,
    factorEmisionId: datos.modalidad === "POOL" ? "factor-pool" : "factor-asignado",
    usuarioAsignadoId: datos.modalidad === "ASIGNADO" ? datos.usuarioAsignadoId || undefined : undefined,
    proximaVerificacionFecha: datos.proximaVerificacionFecha || undefined,
  };
  await vehiculosRepository.create(vehiculo);
  await registrarAuditoria(vehiculo.id, usuarioId, "CREAR", {
    placa: vehiculo.placa,
    modalidad: vehiculo.modalidad,
    territorioId: vehiculo.territorioId,
  });
  return vehiculo;
}

/** Edita los datos generales del vehículo. El territorio y la modalidad NO se editan aquí: usa cambiarTerritorio/cambiarModalidad para que quede auditado. */
export async function actualizarVehiculo(id: string, datos: DatosVehiculo, usuarioId: string): Promise<Vehiculo | ResultadoSinDatos> {
  const existente = await vehiculosRepository.getById(id);
  if (!existente) return crearResultadoSinDatos(`No existe el vehículo ${id}`);

  const placaNormalizada = datos.placa.trim().toUpperCase();
  if (await existePlaca(placaNormalizada, id)) {
    return crearResultadoSinDatos(`Ya existe otro vehículo registrado con la placa ${placaNormalizada}.`);
  }

  const actualizado = await vehiculosRepository.update(id, {
    placa: placaNormalizada,
    marca: datos.marca,
    modelo: datos.modelo,
    anio: datos.anio,
    tipoVehiculo: datos.tipoVehiculo,
    ubicacion: datos.ubicacion,
    capacidadPasajeros: datos.capacidadPasajeros,
    combustibleTipo: datos.combustibleTipo,
    kilometrajeActual: datos.kilometrajeActual,
    rendimientoKmPorLitro: datos.rendimientoKmPorLitro,
    costoPorKm: datos.costoPorKm,
    usuarioAsignadoId: existente.modalidad === "ASIGNADO" ? datos.usuarioAsignadoId || undefined : undefined,
    proximaVerificacionFecha: datos.proximaVerificacionFecha || undefined,
    fechaActualizacion: new Date().toISOString(),
  });
  if (!actualizado) return crearResultadoSinDatos(`No se pudo actualizar el vehículo ${id}`);

  await registrarAuditoria(id, usuarioId, "ACTUALIZACION", { placa: placaNormalizada });
  return actualizado as Vehiculo;
}

// ---------------------------------------------------------------------------
// Bloquear / desbloquear
// ---------------------------------------------------------------------------

export async function bloquearVehiculo(id: string, motivo: string, usuarioId: string): Promise<Vehiculo | ResultadoSinDatos> {
  if (!motivo || motivo.trim().length === 0) {
    return crearResultadoSinDatos("El motivo es obligatorio para bloquear un vehículo.");
  }
  const existente = await vehiculosRepository.getById(id);
  if (!existente) return crearResultadoSinDatos(`No existe el vehículo ${id}`);
  if (existente.estadoOperativo === "FUERA_DE_SERVICIO") {
    return crearResultadoSinDatos("Este vehículo ya está bloqueado.");
  }

  const actualizado = await vehiculosRepository.update(id, {
    estadoOperativo: "FUERA_DE_SERVICIO",
    disponibilidadActual: false,
    fechaActualizacion: new Date().toISOString(),
  });
  if (!actualizado) return crearResultadoSinDatos(`No se pudo bloquear el vehículo ${id}`);

  await registrarAuditoria(id, usuarioId, "BLOQUEO", { motivo: motivo.trim(), estadoAnterior: existente.estadoOperativo });
  return actualizado as Vehiculo;
}

export async function desbloquearVehiculo(id: string, usuarioId: string): Promise<Vehiculo | ResultadoSinDatos> {
  const existente = await vehiculosRepository.getById(id);
  if (!existente) return crearResultadoSinDatos(`No existe el vehículo ${id}`);
  if (existente.estadoOperativo !== "FUERA_DE_SERVICIO") {
    return crearResultadoSinDatos("Este vehículo no está bloqueado.");
  }

  const actualizado = await vehiculosRepository.update(id, {
    estadoOperativo: "DISPONIBLE",
    disponibilidadActual: true,
    fechaActualizacion: new Date().toISOString(),
  });
  if (!actualizado) return crearResultadoSinDatos(`No se pudo desbloquear el vehículo ${id}`);

  await registrarAuditoria(id, usuarioId, "DESBLOQUEO", {});
  return actualizado as Vehiculo;
}

// ---------------------------------------------------------------------------
// Mantenimiento
// ---------------------------------------------------------------------------

export interface DatosMantenimiento {
  fechaProgramada: string;
  tipoMantenimiento: string;
  responsable: string;
}

/** Programa un mantenimiento (fecha, tipo, taller simulado); si la fecha es hoy o ya pasó, pone el vehículo en mantenimiento de inmediato. */
export async function programarMantenimiento(
  vehiculoId: string,
  datos: DatosMantenimiento,
  usuarioId: string
): Promise<Mantenimiento | ResultadoSinDatos> {
  const vehiculo = await vehiculosRepository.getById(vehiculoId);
  if (!vehiculo) return crearResultadoSinDatos(`No existe el vehículo ${vehiculoId}`);
  if (!datos.fechaProgramada) return crearResultadoSinDatos("Indica la fecha programada del mantenimiento.");
  if (!datos.tipoMantenimiento || datos.tipoMantenimiento.trim().length === 0) {
    return crearResultadoSinDatos("Indica el tipo de mantenimiento.");
  }
  if (!datos.responsable || datos.responsable.trim().length === 0) {
    return crearResultadoSinDatos("Indica el taller o responsable (simulado).");
  }

  const ahora = new Date();
  const mantenimiento: Mantenimiento = {
    id: crypto.randomUUID(),
    fechaCreacion: ahora.toISOString(),
    fechaActualizacion: ahora.toISOString(),
    usuarioCreadorId: usuarioId,
    estatus: "ACTIVO",
    vehiculoId,
    tipoMantenimiento: datos.tipoMantenimiento.trim(),
    fechaProgramada: datos.fechaProgramada,
    costo: 0,
    responsable: datos.responsable.trim(),
  };
  await mantenimientosRepository.create(mantenimiento);

  if (datos.fechaProgramada <= fechaLocalISO(ahora)) {
    await vehiculosRepository.update(vehiculoId, {
      estadoOperativo: "EN_MANTENIMIENTO",
      disponibilidadActual: false,
      fechaActualizacion: ahora.toISOString(),
    });
  }

  await registrarAuditoria(vehiculoId, usuarioId, "MANTENIMIENTO_PROGRAMADO", {
    tipoMantenimiento: mantenimiento.tipoMantenimiento,
    fechaProgramada: mantenimiento.fechaProgramada,
    responsable: mantenimiento.responsable,
  });

  return mantenimiento;
}

// ---------------------------------------------------------------------------
// Cambiar territorio / modalidad (auditado)
// ---------------------------------------------------------------------------

export async function cambiarTerritorio(id: string, territorioNuevoId: string, usuarioId: string): Promise<Vehiculo | ResultadoSinDatos> {
  const existente = await vehiculosRepository.getById(id);
  if (!existente) return crearResultadoSinDatos(`No existe el vehículo ${id}`);
  if (existente.territorioId === territorioNuevoId) {
    return crearResultadoSinDatos("El vehículo ya pertenece a ese territorio.");
  }

  const actualizado = await vehiculosRepository.update(id, {
    territorioId: territorioNuevoId,
    fechaActualizacion: new Date().toISOString(),
  });
  if (!actualizado) return crearResultadoSinDatos(`No se pudo actualizar el vehículo ${id}`);

  await registrarAuditoria(id, usuarioId, "CAMBIO_TERRITORIO", {
    territorioAnteriorId: existente.territorioId,
    territorioNuevoId,
  });
  return actualizado as Vehiculo;
}

/**
 * Cambia la modalidad Pool ↔ Asignado y lo deja registrado en auditoría: este
 * cambio altera directamente el conteo Pool/Asignado que usa el dashboard
 * ejecutivo (Chunk 15) para medir el avance hacia la meta 60/40
 * (servicioFlota.calcularComposicionFlotilla).
 */
export async function cambiarModalidad(
  id: string,
  modalidadNueva: ModalidadFlotaVehiculo,
  usuarioId: string
): Promise<Vehiculo | ResultadoSinDatos> {
  const existente = await vehiculosRepository.getById(id);
  if (!existente) return crearResultadoSinDatos(`No existe el vehículo ${id}`);
  if (existente.modalidad === "UBER") {
    return crearResultadoSinDatos("No es posible cambiar la modalidad de un vehículo Uber desde el catálogo de flotilla.");
  }
  if (existente.modalidad === modalidadNueva) {
    return crearResultadoSinDatos("El vehículo ya tiene esa modalidad.");
  }

  const actualizado = await vehiculosRepository.update(id, {
    modalidad: modalidadNueva,
    factorEmisionId: modalidadNueva === "POOL" ? "factor-pool" : "factor-asignado",
    usuarioAsignadoId: modalidadNueva === "POOL" ? undefined : existente.usuarioAsignadoId,
    fechaActualizacion: new Date().toISOString(),
  });
  if (!actualizado) return crearResultadoSinDatos(`No se pudo actualizar el vehículo ${id}`);

  await registrarAuditoria(id, usuarioId, "CAMBIO_MODALIDAD", {
    modalidadAnterior: existente.modalidad,
    modalidadNueva,
  });
  return actualizado as Vehiculo;
}

// ---------------------------------------------------------------------------
// Detalle / historial
// ---------------------------------------------------------------------------

export interface ReservacionPasada {
  reservacion: Reservacion;
  folio: string;
  solicitanteNombre: string;
}

export interface CambioHistorial {
  fecha: string;
  accion: string;
  detalle: string;
  usuarioNombre: string;
}

export interface DetalleVehiculo {
  vehiculo: Vehiculo;
  territorioNombre: string;
  usuarioAsignadoNombre: string | null;
  reservacionesPasadas: ReservacionPasada[];
  mantenimientos: Mantenimiento[];
  incidencias: Incidencia[];
  cambios: CambioHistorial[];
  tendenciaUtilizacion: PuntoTendenciaUtilizacion[];
  motivoBloqueoActual: string | null;
}

const ACCIONES_HISTORIAL = new Set([
  "CAMBIO_TERRITORIO",
  "CAMBIO_MODALIDAD",
  "BLOQUEO",
  "DESBLOQUEO",
  "MANTENIMIENTO_PROGRAMADO",
  "CREAR",
]);

function formatearDetalleAuditoria(accion: string, cambiosJson: string): string {
  try {
    const cambios = JSON.parse(cambiosJson) as Record<string, unknown>;
    switch (accion) {
      case "CAMBIO_TERRITORIO":
        return `${nombreTerritorio(String(cambios.territorioAnteriorId))} → ${nombreTerritorio(String(cambios.territorioNuevoId))}`;
      case "CAMBIO_MODALIDAD":
        return `${cambios.modalidadAnterior} → ${cambios.modalidadNueva}`;
      case "BLOQUEO":
        return `Motivo: ${cambios.motivo}`;
      case "DESBLOQUEO":
        return "Vehículo desbloqueado";
      case "MANTENIMIENTO_PROGRAMADO":
        return `${cambios.tipoMantenimiento} programado para ${cambios.fechaProgramada} · ${cambios.responsable}`;
      case "CREAR":
        return `Alta en el catálogo (${cambios.modalidad}, ${nombreTerritorio(String(cambios.territorioId))})`;
      default:
        return Object.entries(cambios)
          .map(([clave, valor]) => `${clave}: ${valor}`)
          .join(", ");
    }
  } catch {
    return accion;
  }
}

export async function obtenerDetalleVehiculo(id: string): Promise<DetalleVehiculo | null> {
  const vehiculo = await vehiculosRepository.getById(id);
  if (!vehiculo) return null;

  const [reservaciones, mantenimientos, incidencias, auditorias, usuarios] = await Promise.all([
    db.reservaciones.where("vehiculoId").equals(id).toArray(),
    db.mantenimientos.where("vehiculoId").equals(id).toArray(),
    db.incidencias.where("vehiculoId").equals(id).toArray(),
    db.registrosAuditoria.where("entidadId").equals(id).toArray(),
    db.usuarios.toArray(),
  ]);

  const nombrePorUsuario = new Map(usuarios.map((u) => [u.id, u.nombreCompleto]));
  const solicitudIds = [...new Set(reservaciones.map((r) => r.solicitudId))];
  const solicitudes = await Promise.all(solicitudIds.map((sid) => db.solicitudes.get(sid)));
  const solicitudPorId = new Map(solicitudes.filter((s): s is Solicitud => Boolean(s)).map((s) => [s.id, s]));

  const reservacionesPasadas: ReservacionPasada[] = reservaciones
    .map((reservacion) => {
      const solicitud = solicitudPorId.get(reservacion.solicitudId);
      return {
        reservacion,
        folio: solicitud?.folio ?? "—",
        solicitanteNombre: solicitud ? (nombrePorUsuario.get(solicitud.usuarioSolicitanteId) ?? "Usuario desconocido") : "Usuario desconocido",
      };
    })
    .sort((a, b) => b.reservacion.fechaInicio.localeCompare(a.reservacion.fechaInicio));

  const cambios: CambioHistorial[] = auditorias
    .filter((a) => ACCIONES_HISTORIAL.has(a.accion))
    .map((a) => ({
      fecha: a.fechaCambio,
      accion: a.accion,
      detalle: formatearDetalleAuditoria(a.accion, a.cambiosJson),
      usuarioNombre: nombrePorUsuario.get(a.usuarioId) ?? "Usuario desconocido",
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const bloqueoMasReciente = auditorias
    .filter((a) => a.accion === "BLOQUEO" || a.accion === "DESBLOQUEO")
    .sort((a, b) => b.fechaCambio.localeCompare(a.fechaCambio))[0];
  const motivoBloqueoActual =
    vehiculo.estadoOperativo === "FUERA_DE_SERVICIO" && bloqueoMasReciente?.accion === "BLOQUEO"
      ? ((JSON.parse(bloqueoMasReciente.cambiosJson) as { motivo?: string }).motivo ?? null)
      : null;

  return {
    vehiculo,
    territorioNombre: nombreTerritorio(vehiculo.territorioId),
    usuarioAsignadoNombre: vehiculo.usuarioAsignadoId ? (nombrePorUsuario.get(vehiculo.usuarioAsignadoId) ?? null) : null,
    reservacionesPasadas,
    mantenimientos: [...mantenimientos].sort((a, b) => b.fechaProgramada.localeCompare(a.fechaProgramada)),
    incidencias: [...incidencias].sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)),
    cambios,
    tendenciaUtilizacion: calcularTendenciaUtilizacion(reservaciones, SEMANAS_TENDENCIA),
    motivoBloqueoActual,
  };
}

export function esModalidadFlota(modalidad: ModalidadVehiculo): modalidad is ModalidadFlotaVehiculo {
  return modalidad === "POOL" || modalidad === "ASIGNADO";
}
