"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Bell } from "lucide-react";
import { initializeDemoData } from "@/lib/seed/init";
import { listarIncidenciasCriticasAbiertas, type IncidenciaListItem } from "@/lib/adapters/incidencias";
import { useSessionStore } from "@/lib/stores/session";

/** Alerta de incidencias Críticas abiertas, visible desde el header en cualquier pantalla para Admin Flota. */
export function AlertaIncidenciasCriticas() {
  const { rolActivo } = useSessionStore();
  const pathname = usePathname();
  const [criticas, setCriticas] = useState<IncidenciaListItem[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (rolActivo !== "ADMIN_FLOTA") return;
    let cancelado = false;
    initializeDemoData().then(async () => {
      const items = await listarIncidenciasCriticasAbiertas();
      if (!cancelado) setCriticas(items);
    });
    return () => {
      cancelado = true;
    };
    // Se refresca al navegar entre pantallas, para reflejar cambios recientes.
  }, [rolActivo, pathname]);

  if (rolActivo !== "ADMIN_FLOTA" || criticas.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
        aria-label={`${criticas.length} incidencia(s) crítica(s) abierta(s)`}
      >
        <Bell className="h-4 w-4" />
        <span className="hidden sm:inline">
          {criticas.length} incidencia{criticas.length > 1 ? "s" : ""} crítica{criticas.length > 1 ? "s" : ""}
        </span>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white">
          {criticas.length}
        </span>
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-red-200 bg-white p-3 shadow-lg">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">
              <AlertTriangle className="h-3.5 w-3.5" /> Incidencias críticas abiertas
            </p>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto">
              {criticas.map((item) => (
                <li key={item.incidencia.id}>
                  <Link
                    href={`/incidencias/${item.incidencia.id}`}
                    onClick={() => setAbierto(false)}
                    className="block rounded-lg p-2 text-sm hover:bg-red-50"
                  >
                    <p className="font-medium text-slate-900">
                      {item.vehiculo ? `${item.vehiculo.marca} ${item.vehiculo.modelo} (${item.vehiculo.placa})` : "Vehículo desconocido"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.territorioNombre}
                      {item.folioSolicitud ? ` · ${item.folioSolicitud}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/incidencias"
              onClick={() => setAbierto(false)}
              className="mt-2 block rounded-lg bg-red-50 p-2 text-center text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Ver todas en /incidencias
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
