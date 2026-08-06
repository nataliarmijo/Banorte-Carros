"use client";

import { useState } from "react";
import { useSessionStore, type RolActivo } from "@/lib/stores/session";
import { ChevronDown } from "lucide-react";

const rolesEtiqueta: Record<RolActivo, string> = {
  COLABORADOR: "Colaborador",
  APROBADOR: "Aprobador/Jefe",
  ADMIN_FLOTA: "Admin Flota",
  EJECUTIVO: "Ejecutivo",
};

export function RoleSelector() {
  const [open, setOpen] = useState(false);
  const { rolActivo, usuarioActivo, setRolActivo } = useSessionStore();

  const roles: RolActivo[] = ["COLABORADOR", "APROBADOR", "ADMIN_FLOTA", "EJECUTIVO"];

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
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500">Modo de prueba: Cambiar rol</p>
          <div className="space-y-2">
            {roles.map((rol) => (
              <button
                key={rol}
                onClick={() => {
                  setRolActivo(rol);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  rolActivo === rol
                    ? "bg-blue-100 font-semibold text-blue-900"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="font-medium">{rolesEtiqueta[rol]}</span>
                <span className="block text-xs text-slate-500">Tester role switch</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
