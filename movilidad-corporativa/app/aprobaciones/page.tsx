"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Inbox, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { initializeDemoData } from "@/lib/seed/init";
import { useSessionStore } from "@/lib/stores/session";
import { esResultadoSinDatos } from "@/lib/services/types";
import {
  decidirSolicitud,
  listarSolicitudesPendientes,
  type DecisionAprobador,
  type SolicitudPendiente,
} from "@/lib/adapters/aprobaciones";
import { FiltrosBar } from "./_components/filtros-bar";
import { TarjetaSolicitud } from "./_components/tarjeta-solicitud";
import { aplicarFiltros, FILTROS_INICIALES, type FiltrosAprobaciones } from "./_lib/filtros";

export default function AprobacionesPage() {
  const { usuarioActivo } = useSessionStore();
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [items, setItems] = useState<SolicitudPendiente[]>([]);
  const [mensajeError, setMensajeError] = useState("");
  const [filtros, setFiltros] = useState<FiltrosAprobaciones>(FILTROS_INICIALES);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [avisoAccion, setAvisoAccion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!usuarioActivo) return;
    setEstado("cargando");
    try {
      const pendientes = await listarSolicitudesPendientes(usuarioActivo.territorioId);
      setItems(pendientes);
      setEstado("listo");
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar las solicitudes.");
      setEstado("error");
    }
  }, [usuarioActivo]);

  useEffect(() => {
    initializeDemoData().then(cargar);
  }, [cargar]);

  const itemsFiltrados = useMemo(() => aplicarFiltros(items, filtros), [items, filtros]);

  const territoriosDisponibles = useMemo(() => {
    const mapa = new Map(items.map((i) => [i.solicitud.territorioId, i.territorioNombre]));
    return [...mapa.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [items]);

  async function manejarDecision(solicitudId: string, decision: DecisionAprobador, comentario: string) {
    if (!usuarioActivo) return;
    setProcesandoId(solicitudId);
    setAvisoAccion(null);
    try {
      const resultado = await decidirSolicitud({ solicitudId, aprobadorId: usuarioActivo.id, decision, comentario });
      if (esResultadoSinDatos(resultado)) {
        setAvisoAccion(resultado.detalle);
        return;
      }
      await cargar();
    } finally {
      setProcesandoId(null);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Aprobaciones</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Solicitudes pendientes de tu equipo</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Revisa cada solicitud con la comparación de Pool, Asignado y Uber calculada por el sistema (costo, disponibilidad,
            emisiones y ahorro estimado) y decide: aprobar, rechazar o solicitar cambios.
          </p>
        </section>

        {avisoAccion && <ErrorState title="No se pudo completar la acción" description={avisoAccion} />}

        {estado === "cargando" && <LoadingState message="Cargando solicitudes pendientes..." />}

        {estado === "error" && <ErrorState description={mensajeError} />}

        {estado === "listo" &&
          (items.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-12 w-12" />}
              title="No tienes solicitudes pendientes"
              description="Cuando un colaborador de tu territorio envíe una solicitud que requiera aprobación especial, aparecerá aquí."
            />
          ) : (
            <>
              <FiltrosBar
                filtros={filtros}
                onFiltrosChange={(patch) => setFiltros((f) => ({ ...f, ...patch }))}
                territoriosDisponibles={territoriosDisponibles}
              />

              {itemsFiltrados.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="h-12 w-12" />}
                  title="Sin resultados con estos filtros"
                  description="Ajusta los filtros para ver otras solicitudes pendientes."
                />
              ) : (
                <div className="space-y-5">
                  {itemsFiltrados.map((item) => (
                    <TarjetaSolicitud
                      key={item.solicitud.id}
                      item={item}
                      procesando={procesandoId === item.solicitud.id}
                      onDecidir={(decision, comentario) => manejarDecision(item.solicitud.id, decision, comentario)}
                    />
                  ))}
                </div>
              )}
            </>
          ))}
      </div>
    </AppShell>
  );
}
