"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initializeDemoData } from "@/lib/seed/init";
import { useSessionStore } from "@/lib/stores/session";
import {
  fechaLocalISO,
  marcarCoordinacion,
  obtenerPanelOperativo,
  obtenerResumenOperativo,
  extraerTiposVehiculo,
  type PanelOperativo,
  type ResumenOperativo,
} from "@/lib/adapters/operacion";
import { FiltrosBar } from "./_components/filtros-bar";
import { Indicadores } from "./_components/indicadores";
import { PanelResumen } from "./_components/panel-resumen";
import { PendientesDelDia } from "./_components/pendientes-del-dia";
import { PanelIncidencias } from "./_components/panel-incidencias";
import { PanelVehiculos } from "./_components/panel-vehiculos";
import { TablaOperativa } from "./_components/tabla-operativa";
import { aplicarFiltrosFilas, aplicarFiltrosIncidencias, aplicarFiltrosVehiculos, FILTROS_INICIALES, type FiltrosOperacion } from "./_lib/filtros";

export default function OperacionPage() {
  const { usuarioActivo } = useSessionStore();
  const [fecha, setFecha] = useState(() => fechaLocalISO(new Date()));
  const [filtros, setFiltros] = useState<FiltrosOperacion>(FILTROS_INICIALES);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [panel, setPanel] = useState<PanelOperativo | null>(null);
  const [resumen, setResumen] = useState<ResumenOperativo | null>(null);
  const [mensajeError, setMensajeError] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const [datosPanel, datosResumen] = await Promise.all([obtenerPanelOperativo(fecha), obtenerResumenOperativo()]);
      setPanel(datosPanel);
      setResumen(datosResumen);
      setEstado("listo");
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar el panel operativo.");
      setEstado("error");
    }
  }, [fecha]);

  useEffect(() => {
    initializeDemoData().then(cargar);
  }, [cargar]);

  const filasFiltradas = useMemo(() => (panel ? aplicarFiltrosFilas(panel.filas, filtros) : []), [panel, filtros]);
  const retrasosFiltrados = useMemo(() => (panel ? aplicarFiltrosFilas(panel.retrasos, filtros) : []), [panel, filtros]);
  const vehiculosFiltrados = useMemo(() => (panel ? aplicarFiltrosVehiculos(panel.vehiculos, filtros) : []), [panel, filtros]);
  const incidenciasFiltradas = useMemo(() => (panel ? aplicarFiltrosIncidencias(panel.incidencias, filtros) : []), [panel, filtros]);

  const entregasPendientes = useMemo(() => filasFiltradas.filter((f) => f.esEntregaPendiente), [filasFiltradas]);
  const devolucionesPendientes = useMemo(() => filasFiltradas.filter((f) => f.esDevolucionPendiente), [filasFiltradas]);

  const tiposVehiculo = useMemo(() => (panel ? extraerTiposVehiculo(panel.vehiculos) : []), [panel]);
  const responsables = useMemo(() => {
    if (!panel) return [];
    const mapa = new Map(panel.filas.map((f) => [f.solicitud.usuarioSolicitanteId, f.solicitanteNombre]));
    return [...mapa.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [panel]);

  const indicadores = useMemo(
    () => ({
      disponibles: vehiculosFiltrados.filter((v) => v.vehiculo.estadoOperativo === "DISPONIBLE").length,
      enUso: vehiculosFiltrados.filter((v) => v.vehiculo.estadoOperativo === "OCUPADO").length,
      devolucionesRetrasadas: retrasosFiltrados.length,
      enMantenimiento: vehiculosFiltrados.filter((v) => v.vehiculo.estadoOperativo === "EN_MANTENIMIENTO").length,
      incidenciasAbiertas: incidenciasFiltradas.length,
    }),
    [vehiculosFiltrados, retrasosFiltrados, incidenciasFiltradas]
  );

  async function manejarCoordinacion(reservacionId: string, tipo: "ENTREGA" | "DEVOLUCION") {
    if (!usuarioActivo) return;
    setProcesandoId(reservacionId);
    try {
      await marcarCoordinacion(reservacionId, tipo, usuarioActivo.id);
      await cargar();
    } finally {
      setProcesandoId(null);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Operación de flota</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Panel del día</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Entregas y devoluciones del día, disponibilidad de la flota Pool/Asignado e incidencias abiertas.
                Refleja en vivo los cambios de solicitud, aprobación, check-in y check-out.
              </p>
            </div>
            <Button variant="outline" onClick={cargar} disabled={estado === "cargando"}>
              Actualizar
            </Button>
          </div>
        </section>

        {estado === "cargando" && <LoadingState message="Cargando panel operativo..." />}
        {estado === "error" && <ErrorState description={mensajeError} />}

        {estado === "listo" && panel && resumen && (
          <Tabs defaultValue="resumen">
            <TabsList>
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="detalle">Detalle del día</TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="mt-6">
              <PanelResumen resumen={resumen} />
            </TabsContent>

            <TabsContent value="detalle" className="mt-6 space-y-6">
              <Indicadores {...indicadores} />

              <FiltrosBar
                fecha={fecha}
                onFechaChange={setFecha}
                filtros={filtros}
                onFiltrosChange={(patch) => setFiltros((f) => ({ ...f, ...patch }))}
                tiposVehiculo={tiposVehiculo}
                responsables={responsables}
              />

              <PendientesDelDia
                entregas={entregasPendientes}
                devoluciones={devolucionesPendientes}
                usuarioActivoId={usuarioActivo?.id ?? ""}
                procesandoId={procesandoId}
                onMarcarCoordinada={manejarCoordinacion}
                onReasignado={cargar}
              />

              <PanelIncidencias incidencias={incidenciasFiltradas} />

              <PanelVehiculos vehiculos={vehiculosFiltrados} />

              <TablaOperativa filas={filasFiltradas} usuarioActivoId={usuarioActivo?.id ?? ""} onReasignado={cargar} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
