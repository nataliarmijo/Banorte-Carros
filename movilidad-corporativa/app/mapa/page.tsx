"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { initializeDemoData } from "@/lib/seed/init";
import { obtenerDatosMapa, type DatosMapa } from "@/lib/adapters/mapa";
import { FiltrosBar } from "./_components/filtros-bar";
import { Leyenda } from "./_components/leyenda";
import { ListaVehiculos } from "./_components/lista-vehiculos";
import { MapaEsquematico } from "./_components/mapa-esquematico";
import { PanelDetalle } from "./_components/panel-detalle";
import { aplicarFiltrosOrigenes, aplicarFiltrosVehiculos, FILTROS_INICIALES, type FiltrosMapa } from "./_lib/filtros";

export default function MapaPage() {
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [datos, setDatos] = useState<DatosMapa | null>(null);
  const [mensajeError, setMensajeError] = useState("");
  const [filtros, setFiltros] = useState<FiltrosMapa>(FILTROS_INICIALES);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const data = await obtenerDatosMapa();
      setDatos(data);
      setEstado("listo");
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar el mapa.");
      setEstado("error");
    }
  }, []);

  useEffect(() => {
    initializeDemoData().then(cargar);
  }, [cargar]);

  const vehiculosFiltrados = useMemo(() => (datos ? aplicarFiltrosVehiculos(datos.vehiculos, filtros) : []), [datos, filtros]);
  const origenesFiltrados = useMemo(() => (datos ? aplicarFiltrosOrigenes(datos.origenesSolicitudes, filtros) : []), [datos, filtros]);
  const vehiculoSeleccionado = useMemo(
    () => vehiculosFiltrados.find((v) => v.vehiculo.id === seleccionadoId) ?? null,
    [vehiculosFiltrados, seleccionadoId]
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Mapa</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Ubicación de la flotilla</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Vista simulada de dónde está cada vehículo Pool/Asignado ahora mismo y desde dónde salen las
                solicitudes activas. No hay un proveedor de GPS real conectado todavía (ver Chunk 18).
              </p>
            </div>
            <Button variant="outline" onClick={cargar} disabled={estado === "cargando"}>
              Actualizar
            </Button>
          </div>
        </section>

        {estado === "cargando" && <LoadingState message="Cargando ubicaciones simuladas..." />}
        {estado === "error" && <ErrorState description={mensajeError} />}

        {estado === "listo" && datos && (
          <>
            {datos.vehiculos.length === 0 ? (
              <EmptyState title="No hay vehículos en la flotilla" description="Registra vehículos Pool o Asignado en el catálogo para verlos aquí." />
            ) : (
              <>
                <FiltrosBar filtros={filtros} onFiltrosChange={(patch) => setFiltros((f) => ({ ...f, ...patch }))} />
                <Leyenda />

                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="min-w-0 flex-1 space-y-4">
                    <MapaEsquematico
                      vehiculos={vehiculosFiltrados}
                      origenes={origenesFiltrados}
                      seleccionadoId={seleccionadoId}
                      onSeleccionarVehiculo={setSeleccionadoId}
                    />
                    <ListaVehiculos vehiculos={vehiculosFiltrados} seleccionadoId={seleccionadoId} onSeleccionarVehiculo={setSeleccionadoId} />
                  </div>

                  <PanelDetalle vehiculo={vehiculoSeleccionado} onCerrar={() => setSeleccionadoId(null)} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
