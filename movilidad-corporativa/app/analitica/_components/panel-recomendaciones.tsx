"use client";

import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Recomendacion } from "@/lib/services/servicio-analitica";
import type { NivelPrioridad } from "@/lib/models";
import { SEVERIDAD_ESTILOS, SEVERIDAD_LABELS } from "@/lib/ui/incidencias";
import { SeccionCard } from "./seccion-card";

export function PanelRecomendaciones({ recomendaciones }: { recomendaciones: Recomendacion[] }) {
  return (
    <SeccionCard titulo="Recomendaciones para gerencia" descripcion="Generadas a partir de reglas simples sobre los datos reales del periodo filtrado.">
      {recomendaciones.length === 0 ? (
        <p className="text-sm text-slate-500">Sin recomendaciones: los indicadores están dentro de los rangos esperados para los datos y filtros actuales.</p>
      ) : (
        <ul className="space-y-3">
          {recomendaciones.map((r) => (
            <li key={r.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{r.titulo}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", SEVERIDAD_ESTILOS[r.prioridad as NivelPrioridad])}>
                    {SEVERIDAD_LABELS[r.prioridad as NivelPrioridad]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{r.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SeccionCard>
  );
}
