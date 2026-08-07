"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import type { FiltrosVehiculos } from "../_lib/filtros";

interface FiltrosBarProps {
  filtros: FiltrosVehiculos;
  onFiltrosChange: (patch: Partial<FiltrosVehiculos>) => void;
}

const TERRITORIO_ITEMS: Record<string, string> = {
  TODOS: "Todos los territorios",
  ...Object.fromEntries(Object.entries(PARAMS_CONFIG.territorios).map(([id, info]) => [id, info.nombre])),
};

const MODALIDAD_ITEMS: Record<string, string> = {
  TODOS: "Todas las modalidades",
  POOL: MEDIO_LABELS.POOL,
  ASIGNADO: MEDIO_LABELS.ASIGNADO,
  UBER: MEDIO_LABELS.UBER,
};

const ESTADO_ITEMS: Record<string, string> = {
  TODOS: "Todos los estatus",
  DISPONIBLE: "Disponible",
  OCUPADO: "En uso",
  EN_MANTENIMIENTO: "En mantenimiento",
  FUERA_DE_SERVICIO: "Bloqueado",
};

export function FiltrosBar({ filtros, onFiltrosChange }: FiltrosBarProps) {
  const hayFiltrosActivos =
    Boolean(filtros.busqueda) || filtros.territorio !== "TODOS" || filtros.modalidad !== "TODOS" || filtros.estado !== "TODOS";

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por placa, marca, modelo o tipo..."
            className="pl-8"
            value={filtros.busqueda}
            onChange={(e) => onFiltrosChange({ busqueda: e.target.value })}
          />
        </div>

        <Select value={filtros.territorio} onValueChange={(v) => onFiltrosChange({ territorio: v as FiltrosVehiculos["territorio"] })} items={TERRITORIO_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Territorio" /></SelectTrigger>
          <SelectContent>
            {Object.entries(TERRITORIO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.modalidad} onValueChange={(v) => onFiltrosChange({ modalidad: v as FiltrosVehiculos["modalidad"] })} items={MODALIDAD_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Modalidad" /></SelectTrigger>
          <SelectContent>
            {Object.entries(MODALIDAD_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.estado} onValueChange={(v) => onFiltrosChange({ estado: v as FiltrosVehiculos["estado"] })} items={ESTADO_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Estatus" /></SelectTrigger>
          <SelectContent>
            {Object.entries(ESTADO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hayFiltrosActivos && (
        <Button variant="ghost" size="sm" onClick={() => onFiltrosChange({ busqueda: "", territorio: "TODOS", modalidad: "TODOS", estado: "TODOS" })}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
