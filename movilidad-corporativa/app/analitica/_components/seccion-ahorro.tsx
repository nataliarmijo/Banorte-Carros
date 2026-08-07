"use client";

import type { SeccionAhorroDashboard } from "@/lib/adapters/analitica";
import { esResultadoSinDatos } from "@/lib/services/types";
import { COLOR_POOL } from "../_lib/colores";
import { formatoMxn, formatoOSinDatos, formatoPorcentaje } from "../_lib/formato";
import { GraficoLineaMensual } from "./graficos";
import { SeccionCard, TablaSimple } from "./seccion-card";

export function SeccionAhorro({ ahorro }: { ahorro: SeccionAhorroDashboard }) {
  const { resultado, porTerritorio, evolucionMensual, ahorroPromedioPorViaje, roiEstimadoPorcentaje } = ahorro;
  const sinDatos = esResultadoSinDatos(resultado);

  return (
    <SeccionCard
      titulo="Ahorro económico generado"
      descripcion="Costo real optimizado frente al escenario base (todo Asignado, coordinado manualmente), desglosado por concepto, territorio y tiempo."
    >
      {sinDatos ? (
        <p className="text-sm text-slate-500">Sin datos suficientes: {resultado.detalle}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">Ahorro total del periodo</p>
              <p className="text-2xl font-semibold text-emerald-700">{formatoMxn(resultado.ahorroTotal)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Costo escenario base</p>
              <p className="text-lg font-semibold text-slate-900">{formatoMxn(resultado.costoBaseEstimado)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Costo real optimizado</p>
              <p className="text-lg font-semibold text-slate-900">{formatoMxn(resultado.costoRealOptimizado)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Ahorro promedio / viaje</p>
              <p className="text-lg font-semibold text-slate-900">{formatoOSinDatos(ahorroPromedioPorViaje, formatoMxn)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">Supuestos del escenario base (estimado)</p>
            <p className="mt-1 text-sm text-slate-700">{resultado.escenarioBase.descripcion}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
              {resultado.escenarioBase.supuestos.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Por mayor uso de Pool</p>
              <p className="text-lg font-semibold text-slate-900">{formatoMxn(resultado.ahorrosPorConcepto.mayorUsoPool)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Por recomendar Uber</p>
              <p className="text-lg font-semibold text-slate-900">{formatoMxn(resultado.ahorrosPorConcepto.recomendarUberCuandoConviene)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Por digitalización</p>
              <p className="text-lg font-semibold text-slate-900">{formatoMxn(resultado.ahorrosPorConcepto.digitalizacion)}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-xs text-blue-700">ROI estimado (ahorro acumulado ÷ inversión estimada de la iniciativa)</p>
            <p className="text-lg font-semibold text-blue-700">{formatoOSinDatos(roiEstimadoPorcentaje, formatoPorcentaje)}</p>
          </div>
        </>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Ahorro acumulado mensual</p>
        <GraficoLineaMensual datos={evolucionMensual} series={[{ key: "ahorro", etiqueta: "Ahorro", color: COLOR_POOL }]} formatoValor={(v) => formatoMxn(v)} />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Ahorro por territorio</p>
        <TablaSimple
          columnas={["Territorio", "Ahorro"]}
          filas={porTerritorio.map((f) => [f.nombre, esResultadoSinDatos(f.ahorro) ? "Sin datos suficientes" : formatoMxn(f.ahorro.ahorroTotal)])}
        />
      </div>
    </SeccionCard>
  );
}
