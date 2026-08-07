"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { initializeDemoData } from "@/lib/seed/init";
import { db } from "@/lib/repositories/dexie";
import { useSessionStore } from "@/lib/stores/session";
import {
  listarIncidencias,
  obtenerTasaIncidenciasPorCadaCienViajes,
  type IncidenciaListItem,
} from "@/lib/adapters/incidencias";
import type { TasaIncidencias } from "@/lib/services/servicio-incidencias";
import { DialogoNuevaIncidencia } from "./_components/dialogo-nueva-incidencia";
import { FiltrosBar } from "./_components/filtros-bar";
import { TablaIncidencias } from "./_components/tabla-incidencias";
import { aplicarFiltros, FILTROS_INICIALES, type FiltrosIncidencias } from "./_lib/filtros";

export default function IncidenciasPage() {
  const { usuarioActivo } = useSessionStore();
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [items, setItems] = useState<IncidenciaListItem[]>([]);
  const [tasa, setTasa] = useState<TasaIncidencias | null>(null);
  const [vehiculos, setVehiculos] = useState<{ id: string; nombre: string }[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([]);
  const [mensajeError, setMensajeError] = useState("");
  const [filtros, setFiltros] = useState<FiltrosIncidencias>(FILTROS_INICIALES);

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const [listado, tasaCalculada, vehiculosDb, usuariosDb] = await Promise.all([
        listarIncidencias(),
        obtenerTasaIncidenciasPorCadaCienViajes(),
        db.vehiculos.toArray(),
        db.usuarios.toArray(),
      ]);
      setItems(listado);
      setTasa(tasaCalculada);
      setVehiculos(vehiculosDb.map((v) => ({ id: v.id, nombre: `${v.marca} ${v.modelo} (${v.placa})` })));
      setUsuarios(usuariosDb.map((u) => ({ id: u.id, nombre: u.nombreCompleto })));
      setEstado("listo");
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar las incidencias.");
      setEstado("error");
    }
  }, []);

  useEffect(() => {
    initializeDemoData().then(cargar);
  }, [cargar]);

  const itemsFiltrados = useMemo(() => aplicarFiltros(items, filtros), [items, filtros]);
  const responsables = useMemo(() => {
    const idsConIncidencia = new Set(items.map((i) => i.incidencia.responsableId).filter((id): id is string => Boolean(id)));
    return usuarios.filter((u) => idsConIncidencia.has(u.id));
  }, [items, usuarios]);

  const criticasAbiertas = items.filter(
    (i) => i.incidencia.severidad === "CRITICA" && (i.incidencia.estadoIncidencia === "ABIERTA" || i.incidencia.estadoIncidencia === "EN_PROCESO")
  ).length;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Incidencias</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Gestión de incidencias de flotilla</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Daños, accidentes, retrasos, uso fuera de horario y más — generadas automáticamente por check-out o
                registradas manualmente, con bitácora y seguimiento hasta su cierre.
              </p>
            </div>
            {estado === "listo" && usuarioActivo && (
              <DialogoNuevaIncidencia vehiculos={vehiculos} responsables={usuarios} usuarioActivoId={usuarioActivo.id} onCreada={cargar} />
            )}
          </div>
        </section>

        {estado === "listo" && (
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Incidencias totales</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{items.length}</p>
            </div>
            <div className={`rounded-3xl border p-4 shadow-sm ${criticasAbiertas > 0 ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
              <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${criticasAbiertas > 0 ? "text-red-700" : "text-slate-500"}`}>
                <AlertTriangle className="h-3.5 w-3.5" /> Críticas abiertas
              </p>
              <p className={`mt-2 text-3xl font-semibold ${criticasAbiertas > 0 ? "text-red-700" : "text-slate-900"}`}>{criticasAbiertas}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Incidencias por cada 100 viajes</p>
                <Badge variant="secondary">Chunk 15</Badge>
              </div>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{tasa?.tasaPorCadaCienViajes ?? 0}</p>
              <p className="text-xs text-slate-500">
                {tasa?.totalIncidencias ?? 0} incidencia(s) · {tasa?.totalViajes ?? 0} viaje(s) completado(s)
              </p>
            </div>
          </section>
        )}

        {estado === "cargando" && <LoadingState message="Cargando incidencias..." />}
        {estado === "error" && <ErrorState description={mensajeError} />}

        {estado === "listo" &&
          (items.length === 0 ? (
            <EmptyState title="No hay incidencias registradas" description="Las incidencias automáticas del check-out aparecerán aquí, o registra una manualmente." />
          ) : (
            <>
              <FiltrosBar filtros={filtros} onFiltrosChange={(patch) => setFiltros((f) => ({ ...f, ...patch }))} responsables={responsables} />
              <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                {itemsFiltrados.length === 0 ? (
                  <EmptyState title="Sin resultados con estos filtros" description="Ajusta los filtros para ver otras incidencias." />
                ) : (
                  <TablaIncidencias items={itemsFiltrados} />
                )}
              </section>
            </>
          ))}
      </div>
    </AppShell>
  );
}
