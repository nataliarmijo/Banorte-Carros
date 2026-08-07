"use client";

import type { SeccionEmisiones } from "@/lib/services/servicio-analitica";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";

function nombreTerritorio(territorioId: string): string {
  return PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios]?.nombre ?? territorioId;
}
import { COLOR_EMITIDO, COLOR_EVITADO } from "../_lib/colores";
import { formatoNumero, formatoOSinDatos } from "../_lib/formato";
import { GraficoLineaMensual } from "./graficos";
import { SeccionCard, TablaSimple } from "./seccion-card";

function formatoKg(v: number): string {
  return `${formatoNumero(v, 1)} kg`;
}

function formatoGramosPorUnidad(v: number, unidad: string): string {
  return `${formatoNumero(v, 0)} g${unidad}`;
}

export function SeccionEmisionesCO2({ emisiones }: { emisiones: SeccionEmisiones }) {
  const { totalEmitidoKg, totalEvitadoKg, emitidoPorKmGramos, emitidoPorViajeGramos, porAlternativa, porTerritorio, evolucionMensual, factoresUsados } = emisiones;

  return (
    <SeccionCard
      titulo="Emisiones de CO₂ evitadas"
      descripcion="Escenario base (todo Uber) frente a las emisiones reales: CO₂ evitado por km, viaje, alternativa y territorio. Todas las cifras son estimaciones basadas en factores de emisión configurables."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">CO₂ emitido (real)</p>
          <p className="text-2xl font-semibold text-slate-900">{formatoKg(totalEmitidoKg)}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700">CO₂ evitado vs. escenario base</p>
          <p className="text-2xl font-semibold text-emerald-700">{formatoKg(totalEvitadoKg)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Emitido por km</p>
          <p className="text-lg font-semibold text-slate-900">{formatoOSinDatos(emitidoPorKmGramos, (v) => formatoGramosPorUnidad(v, "/km"))}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Emitido por viaje</p>
          <p className="text-lg font-semibold text-slate-900">{formatoOSinDatos(emitidoPorViajeGramos, (v) => formatoGramosPorUnidad(v, ""))}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Evolución mensual (emitido vs. evitado)</p>
        <GraficoLineaMensual
          datos={evolucionMensual}
          series={[
            { key: "emitidoKg", etiqueta: "Emitido", color: COLOR_EMITIDO },
            { key: "evitadoKg", etiqueta: "Evitado", color: COLOR_EVITADO },
          ]}
          formatoValor={formatoKg}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Por alternativa</p>
          <TablaSimple
            columnas={["Alternativa", "Emitido", "Evitado", "Viajes"]}
            filas={porAlternativa.map((f) => [MEDIO_LABELS[f.alternativa], formatoKg(f.emitidoKg), formatoKg(f.evitadoKg), formatoNumero(f.viajes)])}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Por territorio</p>
          <TablaSimple columnas={["Territorio", "Emitido", "Evitado"]} filas={porTerritorio.map((f) => [nombreTerritorio(f.territorioId), formatoKg(f.emitidoKg), formatoKg(f.evitadoKg)])} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-medium text-slate-500">Factores de emisión utilizados (estimados)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
          {factoresUsados.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </SeccionCard>
  );
}
