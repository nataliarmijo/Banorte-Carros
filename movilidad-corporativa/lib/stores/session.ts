import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Usuario } from "@/lib/models";

export type RolActivo = "COLABORADOR" | "APROBADOR" | "ADMIN_FLOTA" | "EJECUTIVO";

interface SessionStore {
  rolActivo: RolActivo;
  usuarioActivo: Usuario | null;
  territorioActivo: string;
  /**
   * Cambia la sesión de prueba al usuario seleccionado en el selector de rol
   * (Chunk 3); su rol y territorio activos se derivan de ese usuario, que a
   * su vez viene de la gestión de usuarios de /administracion (Chunk 17) —
   * ya no hay una lista de usuarios de prueba separada y desincronizada.
   */
  setUsuarioActivo: (usuario: Usuario) => void;
  reset: () => void;
}

/** Valor inicial antes de que el selector de rol cargue la lista real desde Dexie; coincide con user-1 del seed (Chunk 2). */
const USUARIO_INICIAL: Usuario = {
  id: "user-1",
  nombreCompleto: "Ana López",
  correoCorporativo: "ana.lopez@banorte.com",
  empleadoId: "EMP-1001",
  rol: "COLABORADOR",
  territorioId: "territorio-cdmx",
  telefono: "5550000002",
  fechaCreacion: "2025-01-15T08:30:00-06:00",
  fechaActualizacion: "2025-01-15T08:30:00-06:00",
  usuarioCreadorId: "user-admin",
  estatus: "ACTIVO",
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      rolActivo: USUARIO_INICIAL.rol,
      usuarioActivo: USUARIO_INICIAL,
      territorioActivo: USUARIO_INICIAL.territorioId,
      setUsuarioActivo: (usuario) =>
        set({
          rolActivo: usuario.rol,
          usuarioActivo: usuario,
          territorioActivo: usuario.territorioId,
        }),
      reset: () =>
        set({
          rolActivo: USUARIO_INICIAL.rol,
          usuarioActivo: USUARIO_INICIAL,
          territorioActivo: USUARIO_INICIAL.territorioId,
        }),
    }),
    {
      name: "movilidad-session",
      storage: typeof window !== "undefined" ? createJSONStorage(() => localStorage) : undefined,
    }
  )
);
