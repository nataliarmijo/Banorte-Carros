/**
 * Adaptador para /administracion (rol Admin Flota; metas gerenciales de
 * solo lectura para Ejecutivo/Gerente): gestión de los usuarios semilla del
 * Chunk 2 (los mismos que usa el selector de rol del Chunk 3 — ver
 * lib/stores/session.ts, que ahora lee estos registros en vivo en vez de un
 * mapa fijo), gestión de territorios (PARAMS_CONFIG.territorios, la fuente
 * que de hecho consumen todas las vistas), y el listado de auditoría
 * reciente. Los parámetros operativos (horario, costos, emisiones, pesos de
 * asignación, metas) se administran en lib/config/runtime-config.ts.
 */

import { db } from "@/lib/repositories/dexie";
import { registrosAuditoriaRepository, usuariosRepository } from "@/lib/repositories/typed-repositories";
import type { RegistroAuditoria, RolNombre, Usuario } from "@/lib/models";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { crearResultadoSinDatos, esResultadoSinDatos } from "@/lib/services/types";
import type { ResultadoSinDatos } from "@/lib/services/types";
import { guardarSeccionConfiguracion, type ValorTerritorios } from "@/lib/config/runtime-config";

function nombreTerritorio(territorioId: string): string {
  return PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios]?.nombre ?? territorioId;
}

async function registrarAuditoria(entidad: string, entidadId: string, usuarioId: string, accion: string, cambios: Record<string, unknown>): Promise<void> {
  const ahora = new Date().toISOString();
  await registrosAuditoriaRepository.create({
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioId,
    estatus: "ACTIVO",
    entidad,
    entidadId,
    accion,
    usuarioId,
    cambiosJson: JSON.stringify(cambios),
    fechaCambio: ahora,
  });
}

// ---------------------------------------------------------------------------
// 1. Gestión de usuarios
// ---------------------------------------------------------------------------
export interface UsuarioConTerritorio {
  usuario: Usuario;
  territorioNombre: string;
}

export async function listarUsuarios(): Promise<UsuarioConTerritorio[]> {
  const usuarios = await db.usuarios.toArray();
  return usuarios
    .map((usuario) => ({ usuario, territorioNombre: nombreTerritorio(usuario.territorioId) }))
    .sort((a, b) => a.usuario.nombreCompleto.localeCompare(b.usuario.nombreCompleto));
}

export interface DatosUsuario {
  nombreCompleto: string;
  correoCorporativo: string;
  empleadoId: string;
  rol: RolNombre;
  territorioId: string;
  telefono?: string;
  area?: string;
}

async function existeCorreoOEmpleadoId(correo: string, empleadoId: string, idAExcluir?: string): Promise<string | null> {
  const usuarios = await db.usuarios.toArray();
  const correoNormalizado = correo.trim().toLowerCase();
  if (usuarios.some((u) => u.id !== idAExcluir && u.correoCorporativo.trim().toLowerCase() === correoNormalizado)) {
    return `Ya existe un usuario con el correo ${correo}.`;
  }
  if (usuarios.some((u) => u.id !== idAExcluir && u.empleadoId.trim().toLowerCase() === empleadoId.trim().toLowerCase())) {
    return `Ya existe un usuario con el número de empleado ${empleadoId}.`;
  }
  return null;
}

function validarDatosUsuario(datos: DatosUsuario): string | null {
  if (!datos.nombreCompleto.trim()) return "El nombre completo es obligatorio.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correoCorporativo.trim())) return "El correo corporativo no es válido.";
  if (!datos.empleadoId.trim()) return "El número de empleado es obligatorio.";
  if (!PARAMS_CONFIG.territorios[datos.territorioId as keyof typeof PARAMS_CONFIG.territorios]) return "El territorio seleccionado no existe.";
  return null;
}

export async function crearUsuario(datos: DatosUsuario, usuarioId: string): Promise<Usuario | ResultadoSinDatos> {
  const errorFormato = validarDatosUsuario(datos);
  if (errorFormato) return crearResultadoSinDatos(errorFormato);

  const errorDuplicado = await existeCorreoOEmpleadoId(datos.correoCorporativo, datos.empleadoId);
  if (errorDuplicado) return crearResultadoSinDatos(errorDuplicado);

  const ahora = new Date().toISOString();
  const usuario: Usuario = {
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioId,
    estatus: "ACTIVO",
    nombreCompleto: datos.nombreCompleto.trim(),
    correoCorporativo: datos.correoCorporativo.trim().toLowerCase(),
    empleadoId: datos.empleadoId.trim(),
    rol: datos.rol,
    territorioId: datos.territorioId,
    telefono: datos.telefono?.trim() || undefined,
    area: datos.area?.trim() || undefined,
  };
  await usuariosRepository.create(usuario);
  await registrarAuditoria("Usuario", usuario.id, usuarioId, "CREAR", { nombreCompleto: usuario.nombreCompleto, rol: usuario.rol, territorioId: usuario.territorioId });
  return usuario;
}

/** Edita los datos generales del usuario. El rol y el territorio NO se editan aquí: usa cambiarRolUsuario/cambiarTerritorioUsuario para que quede auditado por separado. */
export async function actualizarUsuario(
  id: string,
  datos: Pick<DatosUsuario, "nombreCompleto" | "correoCorporativo" | "empleadoId" | "telefono" | "area">,
  usuarioId: string
): Promise<Usuario | ResultadoSinDatos> {
  const existente = await usuariosRepository.getById(id);
  if (!existente) return crearResultadoSinDatos(`No existe el usuario ${id}.`);

  if (!datos.nombreCompleto.trim()) return crearResultadoSinDatos("El nombre completo es obligatorio.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correoCorporativo.trim())) return crearResultadoSinDatos("El correo corporativo no es válido.");

  const errorDuplicado = await existeCorreoOEmpleadoId(datos.correoCorporativo, datos.empleadoId, id);
  if (errorDuplicado) return crearResultadoSinDatos(errorDuplicado);

  const actualizado = await usuariosRepository.update(id, {
    nombreCompleto: datos.nombreCompleto.trim(),
    correoCorporativo: datos.correoCorporativo.trim().toLowerCase(),
    empleadoId: datos.empleadoId.trim(),
    telefono: datos.telefono?.trim() || undefined,
    area: datos.area?.trim() || undefined,
    fechaActualizacion: new Date().toISOString(),
  });
  if (!actualizado) return crearResultadoSinDatos(`No se pudo actualizar el usuario ${id}.`);

  await registrarAuditoria("Usuario", id, usuarioId, "EDITAR", { nombreCompleto: datos.nombreCompleto });
  return actualizado;
}

export async function cambiarRolUsuario(id: string, rolNuevo: RolNombre, usuarioId: string): Promise<Usuario | ResultadoSinDatos> {
  const existente = await usuariosRepository.getById(id);
  if (!existente) return crearResultadoSinDatos(`No existe el usuario ${id}.`);
  if (existente.rol === rolNuevo) return crearResultadoSinDatos("El usuario ya tiene ese rol.");

  const actualizado = await usuariosRepository.update(id, { rol: rolNuevo, fechaActualizacion: new Date().toISOString() });
  if (!actualizado) return crearResultadoSinDatos(`No se pudo actualizar el usuario ${id}.`);

  await registrarAuditoria("Usuario", id, usuarioId, "CAMBIO_ROL", { rolAnterior: existente.rol, rolNuevo });
  return actualizado;
}

export async function cambiarTerritorioUsuario(id: string, territorioIdNuevo: string, usuarioId: string): Promise<Usuario | ResultadoSinDatos> {
  const existente = await usuariosRepository.getById(id);
  if (!existente) return crearResultadoSinDatos(`No existe el usuario ${id}.`);
  if (!PARAMS_CONFIG.territorios[territorioIdNuevo as keyof typeof PARAMS_CONFIG.territorios]) return crearResultadoSinDatos("El territorio seleccionado no existe.");
  if (existente.territorioId === territorioIdNuevo) return crearResultadoSinDatos("El usuario ya pertenece a ese territorio.");

  const actualizado = await usuariosRepository.update(id, { territorioId: territorioIdNuevo, fechaActualizacion: new Date().toISOString() });
  if (!actualizado) return crearResultadoSinDatos(`No se pudo actualizar el usuario ${id}.`);

  await registrarAuditoria("Usuario", id, usuarioId, "CAMBIO_TERRITORIO", { territorioAnteriorId: existente.territorioId, territorioNuevoId: territorioIdNuevo });
  return actualizado;
}

// ---------------------------------------------------------------------------
// 2. Gestión de territorios (PARAMS_CONFIG.territorios vía runtime-config)
// ---------------------------------------------------------------------------
export interface TerritorioConConteos {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  vehiculos: number;
  usuarios: number;
}

export async function listarTerritoriosConConteos(): Promise<TerritorioConConteos[]> {
  const [vehiculos, usuarios] = await Promise.all([db.vehiculos.toArray(), db.usuarios.toArray()]);
  return Object.entries(PARAMS_CONFIG.territorios)
    .map(([id, info]) => ({
      id,
      nombre: info.nombre,
      latitud: info.latitud,
      longitud: info.longitud,
      vehiculos: vehiculos.filter((v) => v.territorioId === id).length,
      usuarios: usuarios.filter((u) => u.territorioId === id).length,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function actualizarNombreTerritorio(id: string, nombreNuevo: string, usuarioId: string): Promise<ValorTerritorios | ResultadoSinDatos> {
  if (!nombreNuevo.trim()) return crearResultadoSinDatos("El nombre del territorio es obligatorio.");
  if (!PARAMS_CONFIG.territorios[id as keyof typeof PARAMS_CONFIG.territorios]) return crearResultadoSinDatos(`No existe el territorio ${id}.`);

  const valorNuevo: ValorTerritorios = { ...PARAMS_CONFIG.territorios, [id]: { ...PARAMS_CONFIG.territorios[id as keyof typeof PARAMS_CONFIG.territorios], nombre: nombreNuevo.trim() } };
  const resultado = await guardarSeccionConfiguracion("territorios", valorNuevo, usuarioId);
  if (esResultadoSinDatos(resultado)) return resultado;
  return valorNuevo;
}

export async function crearTerritorio(
  nombre: string,
  usuarioId: string,
  coordenadas: { latitud: number; longitud: number } = { latitud: 0, longitud: 0 }
): Promise<ValorTerritorios | ResultadoSinDatos> {
  if (!nombre.trim()) return crearResultadoSinDatos("El nombre del territorio es obligatorio.");

  const id = `territorio-${nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
  if (PARAMS_CONFIG.territorios[id as keyof typeof PARAMS_CONFIG.territorios]) return crearResultadoSinDatos(`Ya existe un territorio equivalente a "${nombre}".`);

  const valorNuevo: ValorTerritorios = { ...PARAMS_CONFIG.territorios, [id]: { nombre: nombre.trim(), latitud: coordenadas.latitud, longitud: coordenadas.longitud } };
  const resultado = await guardarSeccionConfiguracion("territorios", valorNuevo, usuarioId);
  if (esResultadoSinDatos(resultado)) return resultado;
  return valorNuevo;
}

// ---------------------------------------------------------------------------
// Auditoría reciente (visibilidad del requisito 4b en toda la app)
// ---------------------------------------------------------------------------
export async function listarAuditoriaReciente(limite = 30): Promise<RegistroAuditoria[]> {
  const registros = await db.registrosAuditoria.toArray();
  return registros.sort((a, b) => b.fechaCambio.localeCompare(a.fechaCambio)).slice(0, limite);
}
