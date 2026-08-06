"use client";

import { LayoutGrid, List, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { FiltrosReservaciones } from "../_lib/filtros";
import { ESTADOS_SOLICITUD, ESTADO_LABELS, MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import type { ModalidadVehiculo } from "@/lib/models";

export type VistaLista = "tarjetas" | "tabla";

interface FiltrosBarProps {
  filtros: FiltrosReservaciones;
  onFiltrosChange: (patch: Partial<FiltrosReservaciones>) => void;
  territoriosDisponibles: { id: string; nombre: string }[];
  vista: VistaLista;
  onVistaChange: (vista: VistaLista) => void;
}

const ESTADO_ITEMS: Record<string, string> = {
  TODOS: "Todos los estados",
  ...Object.fromEntries(ESTADOS_SOLICITUD.map((e) => [e, ESTADO_LABELS[e]])),
};

const MEDIO_ITEMS: Record<string, string> = {
  TODOS: "Todos los medios",
  ...Object.fromEntries((Object.keys(MEDIO_LABELS) as ModalidadVehiculo[]).map((m) => [m, MEDIO_LABELS[m]])),
};

export function FiltrosBar({ filtros, onFiltrosChange, territoriosDisponibles, vista, onVistaChange }: FiltrosBarProps) {
  const territorioItems: Record<string, string> = {
    TODOS: "Todos los territorios",
    ...Object.fromEntries(territoriosDisponibles.map((t) => [t.id, t.nombre])),
  };

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por folio o destino..."
            className="pl-8"
            value={filtros.busqueda}
            onChange={(e) => onFiltrosChange({ busqueda: e.target.value })}
          />
        </div>

        <div className="flex shrink-0 rounded-lg border border-slate-200 p-0.5">
          <button
            type="button"
            onClick={() => onVistaChange("tarjetas")}
            aria-pressed={vista === "tarjetas"}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              vista === "tarjetas" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> Tarjetas
          </button>
          <button
            type="button"
            onClick={() => onVistaChange("tabla")}
            aria-pressed={vista === "tabla"}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              vista === "tabla" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <List className="h-4 w-4" /> Tabla
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={filtros.estado} onValueChange={(v) => onFiltrosChange({ estado: v as FiltrosReservaciones["estado"] })} items={ESTADO_ITEMS}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ESTADO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>
                {etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.territorio}
          onValueChange={(v) => onFiltrosChange({ territorio: v as string })}
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

        <Select value={filtros.medio} onValueChange={(v) => onFiltrosChange({ medio: v as FiltrosReservaciones["medio"] })} items={MEDIO_ITEMS}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Medio" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MEDIO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>
                {etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Desde"
            value={filtros.fechaDesde}
            onChange={(e) => onFiltrosChange({ fechaDesde: e.target.value })}
          />
          <span className="text-xs text-slate-400">a</span>
          <Input
            type="date"
            aria-label="Hasta"
            value={filtros.fechaHasta}
            onChange={(e) => onFiltrosChange({ fechaHasta: e.target.value })}
          />
        </div>
      </div>

      {(filtros.busqueda || filtros.estado !== "TODOS" || filtros.territorio !== "TODOS" || filtros.medio !== "TODOS" || filtros.fechaDesde || filtros.fechaHasta) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onFiltrosChange({ busqueda: "", estado: "TODOS", territorio: "TODOS", medio: "TODOS", fechaDesde: "", fechaHasta: "" })
          }
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
