"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Info, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Recomendacion, TarjetaKpi } from "@/lib/services/servicio-analitica";
import { formatoOSinDatos, formatoPorcentaje, formatoUnidadKpi } from "../_lib/formato";

function colorVariacion(kpi: TarjetaKpi): string {
  if (kpi.variacionPorcentaje === null || kpi.variacionPorcentaje === 0) return "text-slate-500";
  const esPositivo = kpi.variacionPorcentaje > 0;
  const esBueno = kpi.menorEsMejor ? !esPositivo : esPositivo;
  return esBueno ? "text-emerald-600" : "text-red-600";
}

function cumpleMeta(kpi: TarjetaKpi): boolean | null {
  if (kpi.meta === null || kpi.direccionMeta === undefined) return null;
  return kpi.direccionMeta === "MINIMO" ? kpi.valorActual >= kpi.meta : kpi.valorActual <= kpi.meta;
}

function TarjetaKpiCard({ kpi, seleccionado, onClick }: { kpi: TarjetaKpi; seleccionado: boolean; onClick: () => void }) {
  const meta = cumpleMeta(kpi);
  const Icono = kpi.variacionPorcentaje === null || kpi.variacionPorcentaje === 0 ? Minus : kpi.variacionPorcentaje > 0 ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1.5 rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors hover:border-slate-300",
        seleccionado ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{kpi.etiqueta}</span>
        <Info className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      </div>
      <span className="text-2xl font-semibold text-slate-900">{formatoUnidadKpi(kpi.valorActual, kpi.unidad)}</span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={cn("inline-flex items-center gap-0.5 font-medium", colorVariacion(kpi))}>
          <Icono className="h-3 w-3" />
          {kpi.sinDatosAnterior ? "Sin datos suficientes" : formatoPorcentaje(Math.abs(kpi.variacionPorcentaje ?? 0))}
        </span>
        {kpi.meta !== null && (
          <span className={cn("rounded-full px-1.5 py-0.5", meta ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
            Meta: {formatoUnidadKpi(kpi.meta, kpi.unidad)}
          </span>
        )}
      </div>
    </button>
  );
}

function PanelDetalle({ kpi, recomendacion }: { kpi: TarjetaKpi; recomendacion: Recomendacion | undefined }) {
  const meta = cumpleMeta(kpi);
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
      <h4 className="text-sm font-semibold text-slate-900">{kpi.etiqueta}</h4>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Resultado actual</dt>
          <dd className="text-base font-semibold text-slate-900">{formatoUnidadKpi(kpi.valorActual, kpi.unidad)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Periodo anterior</dt>
          <dd className="text-base font-semibold text-slate-900">{formatoOSinDatos(kpi.valorAnterior, (v) => formatoUnidadKpi(v, kpi.unidad))}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Meta</dt>
          <dd className="text-base font-semibold text-slate-900">
            {kpi.meta === null ? "No aplica" : formatoUnidadKpi(kpi.meta, kpi.unidad)}
            {meta !== null && <span className={cn("ml-2 text-xs font-medium", meta ? "text-emerald-600" : "text-amber-600")}>{meta ? "Cumple" : "No cumple"}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Variación vs. periodo anterior</dt>
          <dd className={cn("text-base font-semibold", colorVariacion(kpi))}>
            {kpi.sinDatosAnterior ? "Sin datos suficientes" : formatoPorcentaje(kpi.variacionPorcentaje ?? 0)}
          </dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-blue-100 pt-3">
        <p className="text-xs font-medium text-slate-500">Fórmula</p>
        <p className="mt-1 text-sm text-slate-700">{kpi.formula}</p>
      </div>
      {recomendacion && (
        <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-blue-100">
          <p className="text-xs font-medium text-blue-700">Recomendación relacionada</p>
          <p className="mt-1 text-sm text-slate-800">{recomendacion.texto}</p>
        </div>
      )}
    </div>
  );
}

interface TarjetasKpiProps {
  kpis: TarjetaKpi[];
  recomendaciones: Recomendacion[];
}

export function TarjetasKpi({ kpis, recomendaciones }: TarjetasKpiProps) {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const seleccionado = kpis.find((k) => k.id === seleccionadoId);
  const recomendacionRelacionada = recomendaciones.find((r) => r.indicadorId === seleccionadoId);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <TarjetaKpiCard key={kpi.id} kpi={kpi} seleccionado={kpi.id === seleccionadoId} onClick={() => setSeleccionadoId(kpi.id === seleccionadoId ? null : kpi.id)} />
        ))}
      </div>
      {seleccionado && <PanelDetalle kpi={seleccionado} recomendacion={recomendacionRelacionada} />}
    </div>
  );
}
