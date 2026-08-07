"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import type { Alternativa } from "@/lib/services/types";
import type { FiltrosAprobaciones } from "../_lib/filtros";

interface FiltrosBarProps {
  filtros: FiltrosAprobaciones;
  onFiltrosChange: (patch: Partial<FiltrosAprobaciones>) => void;
  territoriosDisponibles: { id: string; nombre: string }[];
}

const URGENCIA_ITEMS: Record<string, string> = {
  TODAS: "Todas",
  URGENTES: "Urgentes (salida en 48h o menos)",
};

const MEDIO_ITEMS: Record<string, string> = {
  TODOS: "Todos los medios",
  ...Object.fromEntries((["POOL", "ASIGNADO", "UBER"] as Alternativa[]).map((m) => [m, MEDIO_LABELS[m]])),
};

export function FiltrosBar({ filtros, onFiltrosChange, territoriosDisponibles }: FiltrosBarProps) {
  const territorioItems: Record<string, string> = {
    TODOS: "Todos los territorios",
    ...Object.fromEntries(territoriosDisponibles.map((t) => [t.id, t.nombre])),
  };

  const hayFiltrosActivos = filtros.territorio !== "TODOS" || filtros.urgencia !== "TODAS" || filtros.medio !== "TODOS";

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          value={filtros.territorio}
          onValueChange={(v) => onFiltrosChange({ territorio: v as FiltrosAprobaciones["territorio"] })}
          items={territorioItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Territorio" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(territorioItems).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>
                {etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.urgencia}
          onValueChange={(v) => onFiltrosChange({ urgencia: v as FiltrosAprobaciones["urgencia"] })}
          items={URGENCIA_ITEMS}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Urgencia" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(URGENCIA_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>
                {etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.medio}
          onValueChange={(v) => onFiltrosChange({ medio: v as FiltrosAprobaciones["medio"] })}
          items={MEDIO_ITEMS}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Medio recomendado" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MEDIO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>
                {etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hayFiltrosActivos && (
        <Button variant="ghost" size="sm" onClick={() => onFiltrosChange({ territorio: "TODOS", urgencia: "TODAS", medio: "TODOS" })}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
