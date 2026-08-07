"use client";

import type { SeccionUtilizacionDashboard } from "@/lib/adapters/analitica";
import { COLOR_ASIGNADO, COLOR_POOL } from "../_lib/colores";
import { formatoNumero, formatoOSinDatos, formatoPorcentaje } from "../_lib/formato";
import { GraficoBarras, GraficoLineaMensual } from "./graficos";
import { SeccionCard, TablaSimple } from "./seccion-card";

export function SeccionUtilizacion({ utilizacion }: { utilizacion: SeccionUtilizacionDashboard }) {
  const { resumen, porTerritorio, evolucionMensual, umbralMinimoViajesPorMes, umbralMaximoViajesPorMes } = utilizacion;

  return (
    <SeccionCard
      titulo="Tasa de utilización de la flotilla"
      descripcion={`Pool vs. Asignado, unidades sub/sobreutilizadas (umbral configurable: menos de ${umbralMinimoViajesPorMes} o más de ${umbralMaximoViajesPorMes} viajes/mes), comparación territorial y tendencia mensual.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Utilización Pool</p>
          <p className="text-2xl font-semibold" style={{ color: COLOR_POOL }}>
            {formatoOSinDatos(resumen.promedioPoolPorcentaje, formatoPorcentaje)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Utilización Asignado</p>
          <p className="text-2xl font-semibold" style={{ color: COLOR_ASIGNADO }}>
            {formatoOSinDatos(resumen.promedioAsignadoPorcentaje, formatoPorcentaje)}
          </p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-4">
          <p className="text-xs text-amber-700">Unidades subutilizadas</p>
          <p className="text-2xl font-semibold text-amber-700">{formatoNumero(resumen.subutilizados)}</p>
        </div>
        <div className="rounded-2xl bg-red-50 p-4">
          <p className="text-xs text-red-700">Unidades sobreutilizadas</p>
          <p className="text-2xl font-semibold text-red-700">{formatoNumero(resumen.sobreutilizados)}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Tendencia mensual de utilización</p>
        <GraficoLineaMensual datos={evolucionMensual} series={[{ key: "utilizacionPromedio", etiqueta: "Utilización promedio", color: COLOR_POOL }]} formatoValor={(v) => formatoPorcentaje(v)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Comparación por territorio</p>
          {porTerritorio.length > 0 ? (
            <GraficoBarras datos={porTerritorio.map((f) => ({ etiqueta: f.nombre, valor: f.utilizacionPromedio }))} formatoValor={(v) => formatoPorcentaje(v)} />
          ) : (
            <p className="text-sm text-slate-500">Sin datos suficientes.</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Detalle por territorio</p>
          <TablaSimple
            columnas={["Territorio", "Utilización", "Subutilizadas", "Sobreutilizadas"]}
            filas={porTerritorio.map((f) => [f.nombre, formatoOSinDatos(f.utilizacionPromedio, formatoPorcentaje), formatoNumero(f.subutilizados), formatoNumero(f.sobreutilizados)])}
          />
        </div>
      </div>
    </SeccionCard>
  );
}
