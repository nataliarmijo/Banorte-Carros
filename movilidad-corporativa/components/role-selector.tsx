"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useSessionStore, type RolActivo } from "@/lib/stores/session";
import { initializeDemoData } from "@/lib/seed/init";
import { listarUsuarios, type UsuarioConTerritorio } from "@/lib/adapters/administracion";

const rolesEtiqueta: Record<RolActivo, string> = {
  COLABORADOR: "Colaborador",
  APROBADOR: "Aprobador/Jefe",
  ADMIN_FLOTA: "Admin Flota",
  EJECUTIVO: "Ejecutivo",
};

const ORDEN_ROLES: RolActivo[] = ["COLABORADOR", "APROBADOR", "ADMIN_FLOTA", "EJECUTIVO"];

export function RoleSelector() {
  const [open, setOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioConTerritorio[]>([]);
  const { rolActivo, usuarioActivo, setUsuarioActivo } = useSessionStore();

  useEffect(() => {
    initializeDemoData().then(() => listarUsuarios().then(setUsuarios));
  }, []);

  const usuariosPorRol = ORDEN_ROLES.map((rol) => ({
    rol,
    usuarios: usuarios.filter((u) => u.usuario.rol === rol),
  }));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <span>
          Viendo como: <strong>{rolesEtiqueta[rolActivo]}</strong> · {usuarioActivo?.nombreCompleto}
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500">
            Modo de prueba: cambiar de usuario (administrados en /administracion)
          </p>
          <div className="space-y-4">
            {usuariosPorRol.map(({ rol, usuarios: usuariosDelRol }) => (
              <div key={rol}>
                <p className="mb-1.5 text-xs font-semibold text-slate-400">{rolesEtiqueta[rol]}</p>
                {usuariosDelRol.length === 0 ? (
                  <p className="px-3 text-xs text-slate-400">Sin usuarios con este rol todavía.</p>
                ) : (
                  <div className="space-y-1">
                    {usuariosDelRol.map(({ usuario, territorioNombre }) => (
                      <button
                        key={usuario.id}
                        onClick={() => {
                          setUsuarioActivo(usuario);
                          setOpen(false);
                        }}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                          usuarioActivo?.id === usuario.id
                            ? "bg-blue-100 font-semibold text-blue-900"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="font-medium">{usuario.nombreCompleto}</span>
                        <span className="block text-xs text-slate-500">{territorioNombre}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
