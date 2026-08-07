/**
 * IProveedorSSO — login corporativo (SSO). El MVP NO depende de esto
 * todavía: la sesión activa se elige a mano con el selector de rol del
 * Chunk 3 (components/role-selector.tsx + lib/stores/session.ts), que lee
 * los usuarios reales sembrados en Dexie. Esta interfaz y su mock quedan
 * listas para el día en que haya credenciales de un proveedor de identidad
 * real: en ese momento, `IProveedorSSO.iniciarSesion()` reemplazaría al
 * selector como la única forma de fijar `usuarioActivo`.
 *
 * Implementación real futura: sustituir `ProveedorSSOMock` por un
 * adaptador a un proveedor de identidad corporativo (p. ej. Azure AD /
 * Entra ID, Okta, o Firebase Authentication — ver
 * /lib/integraciones/firebase-adaptadores.ts para esta última). Ver
 * /lib/integraciones/README.md.
 */

import { db } from "@/lib/repositories/dexie";
import type { RolNombre, Usuario } from "@/lib/models";
import type { MetaProveedor } from "./tipos";

export interface UsuarioAutenticado {
  id: string;
  nombreCompleto: string;
  correoCorporativo: string;
  rol: RolNombre;
  territorioId: string;
  /** Nombre del proveedor que autenticó la sesión (p. ej. "Mock interno de SSO", o "Azure AD" en una integración real). */
  proveedor: string;
  esSimulado: boolean;
}

export interface IProveedorSSO {
  meta: MetaProveedor;
  /**
   * Inicia el flujo de autenticación. El mock no pide credenciales: resuelve
   * de inmediato con el usuario indicado (o el primer Admin Flota sembrado,
   * si no se indica ninguno), simulando un login ya completado.
   */
  iniciarSesion(usuarioId?: string): Promise<UsuarioAutenticado | null>;
  cerrarSesion(): Promise<void>;
}

function aUsuarioAutenticado(usuario: Usuario, proveedor: string, esSimulado: boolean): UsuarioAutenticado {
  return {
    id: usuario.id,
    nombreCompleto: usuario.nombreCompleto,
    correoCorporativo: usuario.correoCorporativo,
    rol: usuario.rol,
    territorioId: usuario.territorioId,
    proveedor,
    esSimulado,
  };
}

/** Mock de SSO: no valida ninguna credencial real; sólo resuelve con un usuario ya sembrado en Dexie. No está conectado a ningún flujo del MVP todavía. */
export class ProveedorSSOMock implements IProveedorSSO {
  meta: MetaProveedor = {
    nombre: "Mock interno de SSO",
    esReal: false,
    notaSimulacion: "No valida ninguna credencial; resuelve de inmediato con un usuario semilla. No reemplaza al selector de rol en este MVP.",
  };

  async iniciarSesion(usuarioId?: string): Promise<UsuarioAutenticado | null> {
    const usuario = usuarioId ? await db.usuarios.get(usuarioId) : (await db.usuarios.where("rol").equals("ADMIN_FLOTA").toArray())[0];
    if (!usuario) return null;
    return aUsuarioAutenticado(usuario, this.meta.nombre, true);
  }

  async cerrarSesion(): Promise<void> {
    // No-op: el mock no mantiene ningún estado de sesión propio (lib/stores/session.ts lo hace hoy).
  }
}

export const proveedorSSO: IProveedorSSO = new ProveedorSSOMock();
