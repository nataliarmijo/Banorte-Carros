"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData, resetDemoData } from "@/lib/seed/init";

export default function AdministracionPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("Cargando datos de demostración...");

  const loadCounts = async () => {
    const nextCounts = {
      usuarios: await db.usuarios.count(),
      territorios: await db.territorios.count(),
      vehiculos: await db.vehiculos.count(),
      solicitudes: await db.solicitudes.count(),
      reservaciones: await db.reservaciones.count(),
      incidencias: await db.incidencias.count(),
      registrosAuditoria: await db.registrosAuditoria.count(),
    };
    setCounts(nextCounts);
  };

  useEffect(() => {
    initializeDemoData().then(() => {
      setMessage("Datos de demostración cargados correctamente.");
      loadCounts();
    });
  }, []);

  const handleReset = async () => {
    setMessage("Reinicializando datos...");
    await resetDemoData();
    await loadCounts();
    setMessage("Datos reinicializados correctamente.");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Administración</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Verificación de datos persistidos</h2>
            </div>
            <button
              onClick={handleReset}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Reiniciar demo
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-600">{message}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(counts).map(([key, value]) => (
            <div key={key} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm capitalize text-slate-500">{key.replace(/([A-Z])/g, " $1")}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
