"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARAMS_CONFIG } from "@/lib/config/params";
import {
  ESTADO_INCIDENCIA_LABELS,
  ESTADOS_INCIDENCIA,
  NIVELES_PRIORIDAD,
  SEVERIDAD_LABELS,
  TIPO_INCIDENCIA_LABELS,
  TIPOS_INCIDENCIA,
} from "@/lib/ui/incidencias";
import type { FiltrosIncidencias } from "../_lib/filtros";

interface FiltrosBarProps {
  filtros: FiltrosIncidencias;
  onFiltrosChange: (patch: Partial<FiltrosIncidencias>) => void;
  responsables: { id: string; nombre: string }[];
}

const TIPO_ITEMS: Record<string, string> = {
  TODOS: "Todos los tipos",
  ...Object.fromEntries(TIPOS_INCIDENCIA.map((t) => [t, TIPO_INCIDENCIA_LABELS[t]])),
};

const SEVERIDAD_ITEMS: Record<string, string> = {
  TODOS: "Todas las severidades",
  ...Object.fromEntries(NIVELES_PRIORIDAD.map((s) => [s, SEVERIDAD_LABELS[s]])),
};

const ESTADO_ITEMS: Record<string, string> = {
  TODOS: "Todos los estatus",
  ...Object.fromEntries(ESTADOS_INCIDENCIA.map((e) => [e, ESTADO_INCIDENCIA_LABELS[e]])),
};

const TERRITORIO_ITEMS: Record<string, string> = {
  TODOS: "Todos los territorios",
  ...Object.fromEntries(Object.entries(PARAMS_CONFIG.territorios).map(([id, info]) => [id, info.nombre])),
};

export function FiltrosBar({ filtros, onFiltrosChange, responsables }: FiltrosBarProps) {
  const responsableItems: Record<string, string> = {
    TODOS: "Todos los responsables",
    ...Object.fromEntries(responsables.map((r) => [r.id, r.nombre])),
  };

  const hayFiltrosActivos =
    filtros.tipo !== "TODOS" ||
    filtros.severidad !== "TODOS" ||
    filtros.estado !== "TODOS" ||
    filtros.territorio !== "TODOS" ||
    filtros.responsable !== "TODOS";

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select value={filtros.tipo} onValueChange={(v) => onFiltrosChange({ tipo: v as FiltrosIncidencias["tipo"] })} items={TIPO_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            {Object.entries(TIPO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.severidad} onValueChange={(v) => onFiltrosChange({ severidad: v as FiltrosIncidencias["severidad"] })} items={SEVERIDAD_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Severidad" /></SelectTrigger>
          <SelectContent>
            {Object.entries(SEVERIDAD_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.estado} onValueChange={(v) => onFiltrosChange({ estado: v as FiltrosIncidencias["estado"] })} items={ESTADO_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Estatus" /></SelectTrigger>
          <SelectContent>
            {Object.entries(ESTADO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.territorio} onValueChange={(v) => onFiltrosChange({ territorio: v as FiltrosIncidencias["territorio"] })} items={TERRITORIO_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Territorio" /></SelectTrigger>
          <SelectContent>
            {Object.entries(TERRITORIO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.responsable} onValueChange={(v) => onFiltrosChange({ responsable: v as FiltrosIncidencias["responsable"] })} items={responsableItems}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Responsable" /></SelectTrigger>
          <SelectContent>
            {Object.entries(responsableItems).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hayFiltrosActivos && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltrosChange({ tipo: "TODOS", severidad: "TODOS", estado: "TODOS", territorio: "TODOS", responsable: "TODOS" })}
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
