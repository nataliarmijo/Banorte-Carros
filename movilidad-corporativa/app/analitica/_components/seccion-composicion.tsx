"use client";

import type { SeccionComposicionDashboard } from "@/lib/adapters/analitica";
import { COLOR_ASIGNADO, COLOR_POOL } from "../_lib/colores";
import { formatoNumero, formatoPorcentaje } from "../_lib/formato";
import { GraficoAreaMensual, GraficoBarrasAgrupadas } from "./graficos";
import { SeccionCard } from "./seccion-card";

export function SeccionComposicion({ composicion }: { composicion: SeccionComposicionDashboard }) {
  const { actual, metaPoolPorcentaje, metaAsignadoPorcentaje, evolucionMensual, porTerritorio, porTipoVehiculo } = composicion;
  const cumpleMetaPool = actual.totalFlota > 0 && actual.poolPorcentaje >= metaPoolPorcentaje;

  return (
    <SeccionCard
      titulo="Composición Asignado vs. Pool"
      descripcion="Mezcla actual de la flotilla propia (Pool/Asignado, excluye Uber) frente a la meta 60/40, su evolución y desglose."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Pool</p>
          <p className="text-2xl font-semibold text-slate-900">{actual.totalFlota > 0 ? formatoPorcentaje(actual.poolPorcentaje) : "Sin datos suficientes"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {actual.poolCount} unidades · meta {formatoPorcentaje(metaPoolPorcentaje)}
            {actual.totalFlota > 0 && <span className={cumpleMetaPool ? "ml-1 text-emerald-600" : "ml-1 text-amber-600"}>{cumpleMetaPool ? "· cumple" : "· no cumple"}</span>}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Asignado</p>
          <p className="text-2xl font-semibold text-slate-900">{actual.totalFlota > 0 ? formatoPorcentaje(actual.asignadoPorcentaje) : "Sin datos suficientes"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {actual.asignadoCount} unidades · meta {formatoPorcentaje(metaAsignadoPorcentaje)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
          <p className="text-xs text-slate-500">Total de flotilla</p>
          <p className="text-2xl font-semibold text-slate-900">{formatoNumero(actual.totalFlota)} unidades</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Evolución mensual del uso Pool vs. Asignado (% de viajes completados)</p>
        <GraficoAreaMensual
          datos={evolucionMensual}
          series={[
            { key: "poolPorcentaje", etiqueta: "Pool", color: COLOR_POOL },
            { key: "asignadoPorcentaje", etiqueta: "Asignado", color: COLOR_ASIGNADO },
          ]}
          formatoValor={(v) => formatoPorcentaje(v)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Por territorio</p>
          {porTerritorio.length > 0 ? (
            <GraficoBarrasAgrupadas
              datos={porTerritorio.map((f) => ({ etiqueta: f.nombre, pool: f.poolCount, asignado: f.asignadoCount }))}
              series={[
                { key: "pool", etiqueta: "Pool", color: COLOR_POOL },
                { key: "asignado", etiqueta: "Asignado", color: COLOR_ASIGNADO },
              ]}
              formatoValor={(v) => formatoNumero(v)}
            />
          ) : (
            <p className="text-sm text-slate-500">Sin datos suficientes.</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Por tipo de vehículo</p>
          {porTipoVehiculo.length > 0 ? (
            <GraficoBarrasAgrupadas
              datos={porTipoVehiculo.map((f) => ({ etiqueta: f.nombre, pool: f.poolCount, asignado: f.asignadoCount }))}
              series={[
                { key: "pool", etiqueta: "Pool", color: COLOR_POOL },
                { key: "asignado", etiqueta: "Asignado", color: COLOR_ASIGNADO },
              ]}
              formatoValor={(v) => formatoNumero(v)}
            />
          ) : (
            <p className="text-sm text-slate-500">Sin datos suficientes.</p>
          )}
        </div>
      </div>
    </SeccionCard>
  );
}
