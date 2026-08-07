"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { initializeDemoData } from "@/lib/seed/init";
import { listarCatalogoVehiculos, obtenerComposicionFlotilla, type VehiculoCatalogoItem } from "@/lib/adapters/vehiculos";
import type { ComposicionFlotilla } from "@/lib/services/servicio-flota";
import { FiltrosBar } from "./_components/filtros-bar";
import { TablaCatalogo } from "./_components/tabla-catalogo";
import { aplicarFiltros, FILTROS_INICIALES, type FiltrosVehiculos } from "./_lib/filtros";

const META_POOL_PORCENTAJE = 60;

export default function VehiculosPage() {
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [items, setItems] = useState<VehiculoCatalogoItem[]>([]);
  const [composicion, setComposicion] = useState<ComposicionFlotilla | null>(null);
  const [mensajeError, setMensajeError] = useState("");
  const [filtros, setFiltros] = useState<FiltrosVehiculos>(FILTROS_INICIALES);

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const [catalogo, comp] = await Promise.all([listarCatalogoVehiculos(), obtenerComposicionFlotilla()]);
      setItems(catalogo);
      setComposicion(comp);
      setEstado("listo");
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar el catálogo de vehículos.");
      setEstado("error");
    }
  }, []);

  useEffect(() => {
    initializeDemoData().then(cargar);
  }, [cargar]);

  const itemsFiltrados = useMemo(() => aplicarFiltros(items, filtros), [items, filtros]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Vehículos</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Catálogo de la flotilla</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Ficha completa de cada unidad Pool y Asignado: datos técnicos, ubicación, estatus, próxima verificación
                y utilización reciente. Los cambios de territorio y modalidad quedan registrados en auditoría.
              </p>
            </div>
            <Button size="lg" render={<Link href="/vehiculos/nuevo" />} nativeButton={false}>
              <PlusCircle className="h-4 w-4" /> Nuevo vehículo
            </Button>
          </div>
        </section>

        {estado === "listo" && composicion && composicion.totalFlota > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Composición de flotilla (meta 60/40 Pool/Asignado)</p>
              <p className="text-xs text-slate-500">
                {composicion.poolCount} Pool · {composicion.asignadoCount} Asignado · {composicion.totalFlota} unidades
              </p>
            </div>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="bg-sky-500" style={{ width: `${composicion.poolPorcentaje}%` }} />
              <div className="bg-indigo-500" style={{ width: `${composicion.asignadoPorcentaje}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                Pool {composicion.poolPorcentaje}% · Asignado {composicion.asignadoPorcentaje}%
              </span>
              <span className={composicion.poolPorcentaje >= META_POOL_PORCENTAJE ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>
                Meta Pool: {META_POOL_PORCENTAJE}%
              </span>
            </div>
          </section>
        )}

        {estado === "cargando" && <LoadingState message="Cargando catálogo de vehículos..." />}
        {estado === "error" && <ErrorState description={mensajeError} />}

        {estado === "listo" && (
          <>
            {items.length === 0 ? (
              <EmptyState
                title="Todavía no hay vehículos en el catálogo"
                description="Registra la primera unidad de la flotilla para empezar a administrarla."
                action={
                  <Button render={<Link href="/vehiculos/nuevo" />} nativeButton={false}>
                    <PlusCircle className="h-4 w-4" /> Nuevo vehículo
                  </Button>
                }
              />
            ) : (
              <>
                <FiltrosBar filtros={filtros} onFiltrosChange={(patch) => setFiltros((f) => ({ ...f, ...patch }))} />
                <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <TablaCatalogo items={itemsFiltrados} />
                </section>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
