"use client";

import type { SeccionCostoPorKmDashboard } from "@/lib/adapters/analitica";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import { COLOR_POR_ALTERNATIVA } from "../_lib/colores";
import { formatoMxn, formatoNumero, formatoOSinDatos } from "../_lib/formato";
import { GraficoBarras, GraficoLineaMensual } from "./graficos";
import { SeccionCard, TablaSimple } from "./seccion-card";

export function SeccionCostoPorKm({ costoPorKm }: { costoPorKm: SeccionCostoPorKmDashboard }) {
  const { porAlternativa, evolucionMensual, porTerritorio, porTipoVehiculo, porTipoViaje } = costoPorKm;

  return (
    <SeccionCard titulo="Costo por kilómetro por alternativa" descripcion="Comparación Pool vs. Asignado vs. Uber: costo promedio por km, costo total, km recorridos y desglose.">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Costo promedio por km</p>
        <GraficoBarras
          datos={porAlternativa.map((a) => ({ etiqueta: MEDIO_LABELS[a.alternativa], valor: a.costoPromedioPorKm, color: COLOR_POR_ALTERNATIVA[a.alternativa] }))}
          formatoValor={(v) => formatoMxn(v)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {porAlternativa.map((a) => (
          <div key={a.alternativa} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{MEDIO_LABELS[a.alternativa]}</p>
            <p className="text-lg font-semibold text-slate-900">{formatoOSinDatos(a.costoPromedioPorKm, (v) => `${formatoMxn(v)}/km`)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {formatoNumero(a.viajes)} viajes · {formatoNumero(a.kmTotal)} km · {formatoMxn(a.costoTotal)} total
            </p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Variación mensual del costo por km</p>
        <GraficoLineaMensual
          datos={evolucionMensual}
          series={[
            { key: "pool", etiqueta: "Pool", color: COLOR_POR_ALTERNATIVA.POOL },
            { key: "asignado", etiqueta: "Asignado", color: COLOR_POR_ALTERNATIVA.ASIGNADO },
            { key: "uber", etiqueta: "Uber", color: COLOR_POR_ALTERNATIVA.UBER },
          ]}
          formatoValor={(v) => formatoMxn(v)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Por territorio</p>
          <TablaSimple
            columnas={["Territorio", "$/km", "Km totales"]}
            filas={porTerritorio.map((f) => [f.nombre, formatoOSinDatos(f.costoPromedioPorKm ?? null, formatoMxn), formatoNumero(f.kmTotal ?? 0)])}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Por tipo de vehículo</p>
          <TablaSimple
            columnas={["Tipo", "$/km", "Km totales"]}
            filas={porTipoVehiculo.map((f) => [f.nombre, formatoOSinDatos(f.costoPromedioPorKm ?? null, formatoMxn), formatoNumero(f.kmTotal ?? 0)])}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Por tipo de recorrido</p>
          <TablaSimple
            columnas={["Tipo de viaje", "$/km", "Km totales"]}
            filas={porTipoViaje.map((f) => [f.nombre, formatoOSinDatos(f.costoPromedioPorKm ?? null, formatoMxn), formatoNumero(f.kmTotal ?? 0)])}
          />
        </div>
      </div>
    </SeccionCard>
  );
}
