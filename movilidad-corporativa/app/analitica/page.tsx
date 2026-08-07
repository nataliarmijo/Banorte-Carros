"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/states";
import { initializeDemoData } from "@/lib/seed/init";
import { obtenerDashboardAnalitica, type DashboardAnalitica } from "@/lib/adapters/analitica";
import { FiltrosBar } from "./_components/filtros-bar";
import { TarjetasKpi } from "./_components/tarjetas-kpi";
import { SeccionComposicion } from "./_components/seccion-composicion";
import { SeccionCostoPorKm } from "./_components/seccion-costo-km";
import { SeccionUtilizacion } from "./_components/seccion-utilizacion";
import { SeccionAhorro } from "./_components/seccion-ahorro";
import { SeccionEmisionesCO2 } from "./_components/seccion-emisiones";
import { SeccionComparativa } from "./_components/seccion-comparativa";
import { PanelRecomendaciones } from "./_components/panel-recomendaciones";
import { construirFiltrosAdaptador, FILTROS_INICIALES, PERIODO_PRESET_LABELS, type FiltrosUI } from "./_lib/filtros";

export default function AnaliticaPage() {
  const [filtros, setFiltros] = useState<FiltrosUI>(FILTROS_INICIALES);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [dashboard, setDashboard] = useState<DashboardAnalitica | null>(null);
  const [mensajeError, setMensajeError] = useState("");

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const data = await obtenerDashboardAnalitica(construirFiltrosAdaptador(filtros));
      setDashboard(data);
      setEstado("listo");
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar la analítica.");
      setEstado("error");
    }
  }, [filtros]);

  useEffect(() => {
    initializeDemoData().then(cargar);
  }, [cargar]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Analítica ejecutiva</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Movilidad corporativa: desempeño, costo y ahorro</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Indicadores, costos, utilización, ahorro y emisiones de la flotilla, con filtros globales y recomendaciones accionables
                generadas a partir de los datos reales del periodo seleccionado ({PERIODO_PRESET_LABELS[filtros.periodo].toLowerCase()}).
              </p>
            </div>
            <Button variant="outline" onClick={cargar} disabled={estado === "cargando"}>
              Actualizar
            </Button>
          </div>
        </section>

        {estado === "cargando" && <LoadingState message="Cargando analítica..." />}
        {estado === "error" && <ErrorState description={mensajeError} />}

        {estado === "listo" && dashboard && (
          <>
            <FiltrosBar filtros={filtros} onFiltrosChange={(patch) => setFiltros((f) => ({ ...f, ...patch }))} opciones={dashboard.opcionesFiltro} />

            <TarjetasKpi kpis={dashboard.kpis} recomendaciones={dashboard.recomendaciones} />

            <SeccionComposicion composicion={dashboard.composicion} />
            <SeccionCostoPorKm costoPorKm={dashboard.costoPorKm} />
            <SeccionUtilizacion utilizacion={dashboard.utilizacion} />
            <SeccionAhorro ahorro={dashboard.ahorro} />
            <SeccionEmisionesCO2 emisiones={dashboard.emisiones} />

            <SeccionComparativa
              matrizComparativa={dashboard.matrizComparativa}
              rankingTerritoriosPorAhorro={dashboard.rankingTerritoriosPorAhorro}
              rankingUnidadesSubutilizadas={dashboard.rankingUnidadesSubutilizadas}
              vehiculosExtremos={dashboard.vehiculosExtremos}
              incidenciasPorCategoria={dashboard.incidenciasPorCategoria}
            />

            <PanelRecomendaciones recomendaciones={dashboard.recomendaciones} />
          </>
        )}
      </div>
    </AppShell>
  );
}
