"use client";

import { Car, Clock3, Gauge, MapPin, User, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import type { VehiculoMapa } from "@/lib/adapters/mapa";
import { ESTILO_BADGE_ESTADO, ETIQUETA_ESTADO } from "../_lib/estilos";

function formatearHaceTiempo(fechaISO: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(fechaISO).getTime()) / 60000));
  if (minutos < 1) return "hace instantes";
  if (minutos === 1) return "hace 1 minuto";
  if (minutos < 60) return `hace ${minutos} minutos`;
  const horas = Math.round(minutos / 60);
  return horas === 1 ? "hace 1 hora" : `hace ${horas} horas`;
}

function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function Contenido({ v }: { v: VehiculoMapa }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{v.vehiculo.placa}</p>
        <h3 className="mt-0.5 text-lg font-semibold text-slate-900">
          {v.vehiculo.marca} {v.vehiculo.modelo} ({v.vehiculo.anio})
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`border-transparent font-medium ${ESTILO_BADGE_ESTADO[v.estadoMapa]}`}>
            {ETIQUETA_ESTADO[v.estadoMapa]}
          </Badge>
          <Badge variant="secondary">{MEDIO_LABELS[v.vehiculo.modalidad]}</Badge>
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-500">Territorio / ubicación</dt>
            <dd className="font-medium text-slate-900">
              {v.territorioNombre} · {v.vehiculo.ubicacion}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-500">Conductor actual</dt>
            <dd className="font-medium text-slate-900">{v.conductorActualNombre ?? "Sin conductor (no está en uso)"}</dd>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-500">Kilometraje actual</dt>
            <dd className="font-medium text-slate-900">{v.vehiculo.kilometrajeActual.toLocaleString("es-MX")} km</dd>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-500">Última actualización de posición</dt>
            <dd className="font-medium text-slate-900">
              {formatearHaceTiempo(v.ultimaActualizacion)}
              {v.actualizacionEsSimulada && <span className="ml-1 text-xs font-normal text-slate-400">(simulado)</span>}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Car className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-500">Próxima reservación programada</dt>
            <dd className="font-medium text-slate-900">
              {v.proximaReservacion ? `${v.proximaReservacion.folio} · ${formatearFecha(v.proximaReservacion.fechaInicio)}` : "Sin reservaciones próximas"}
            </dd>
          </div>
        </div>
      </dl>
    </div>
  );
}

function DetalleVacio() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
      <Car className="h-8 w-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-600">Selecciona un vehículo</p>
      <p className="max-w-[16rem] text-xs text-slate-500">Haz clic en un punto del mapa o en una tarjeta de la lista para ver su ficha.</p>
    </div>
  );
}

interface PanelDetalleProps {
  vehiculo: VehiculoMapa | null;
  onCerrar: () => void;
}

/** Panel de detalle: barra lateral fija en escritorio, bottom sheet sobre el mapa en móvil. */
export function PanelDetalle({ vehiculo, onCerrar }: PanelDetalleProps) {
  return (
    <>
      <aside className="hidden lg:block lg:w-80 lg:shrink-0">
        <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {vehiculo ? <Contenido v={vehiculo} /> : <DetalleVacio />}
        </div>
      </aside>

      {vehiculo && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-xl">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="mb-2 flex justify-end">
              <Button variant="ghost" size="icon-sm" onClick={onCerrar} aria-label="Cerrar">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Contenido v={vehiculo} />
          </div>
        </div>
      )}
    </>
  );
}
