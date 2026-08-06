import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Usuario } from "@/lib/models";

export type RolActivo = "COLABORADOR" | "APROBADOR" | "ADMIN_FLOTA" | "EJECUTIVO";

interface SessionStore {
  rolActivo: RolActivo;
  usuarioActivo: Usuario | null;
  territorioActivo: string;
  setRolActivo: (rol: RolActivo) => void;
  setUsuarioActivo: (usuario: Usuario | null) => void;
  setTerritorioActivo: (territorio: string) => void;
  reset: () => void;
}

const usuariosDemo: Record<RolActivo, Usuario> = {
  COLABORADOR: {
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
  },
  APROBADOR: {
    id: "user-2",
    nombreCompleto: "Luis Ramírez",
    correoCorporativo: "luis.ramirez@banorte.com",
    empleadoId: "EMP-1002",
    rol: "APROBADOR",
    territorioId: "territorio-cdmx",
    telefono: "5550000003",
    fechaCreacion: "2025-01-15T08:30:00-06:00",
    fechaActualizacion: "2025-01-15T08:30:00-06:00",
    usuarioCreadorId: "user-admin",
    estatus: "ACTIVO",
  },
  ADMIN_FLOTA: {
    id: "user-admin",
    nombreCompleto: "María Torres",
    correoCorporativo: "maria.torres@banorte.com",
    empleadoId: "EMP-1000",
    rol: "ADMIN_FLOTA",
    territorioId: "territorio-cdmx",
    telefono: "5550000001",
    fechaCreacion: "2025-01-15T08:30:00-06:00",
    fechaActualizacion: "2025-01-15T08:30:00-06:00",
    usuarioCreadorId: "user-admin",
    estatus: "ACTIVO",
  },
  EJECUTIVO: {
    id: "user-3",
    nombreCompleto: "Sofía Méndez",
    correoCorporativo: "sofia.mendez@banorte.com",
    empleadoId: "EMP-1003",
    rol: "EJECUTIVO",
    territorioId: "territorio-guadalajara",
    telefono: "5550000004",
    fechaCreacion: "2025-01-15T08:30:00-06:00",
    fechaActualizacion: "2025-01-15T08:30:00-06:00",
    usuarioCreadorId: "user-admin",
    estatus: "ACTIVO",
  },
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      rolActivo: "COLABORADOR",
      usuarioActivo: usuariosDemo.COLABORADOR,
      territorioActivo: "territorio-cdmx",
      setRolActivo: (rol) =>
        set({
          rolActivo: rol,
          usuarioActivo: usuariosDemo[rol],
          territorioActivo: usuariosDemo[rol].territorioId,
        }),
      setUsuarioActivo: (usuario) => set({ usuarioActivo: usuario }),
      setTerritorioActivo: (territorio) => set({ territorioActivo: territorio }),
      reset: () =>
        set({
          rolActivo: "COLABORADOR",
          usuarioActivo: usuariosDemo.COLABORADOR,
          territorioActivo: "territorio-cdmx",
        }),
    }),
    {
      name: "movilidad-session",
      storage: typeof window !== "undefined" ? createJSONStorage(() => localStorage) : undefined,
    }
  )
);
