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
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import { ETIQUETA_ESTADO } from "../_lib/estilos";
import type { FiltrosMapa } from "../_lib/filtros";

interface FiltrosBarProps {
  filtros: FiltrosMapa;
  onFiltrosChange: (patch: Partial<FiltrosMapa>) => void;
}

const TERRITORIO_ITEMS: Record<string, string> = {
  TODOS: "Todos los territorios",
  ...Object.fromEntries(Object.entries(PARAMS_CONFIG.territorios).map(([id, info]) => [id, info.nombre])),
};

const ESTADO_ITEMS: Record<string, string> = {
  TODOS: "Todos los estatus",
  DISPONIBLE: ETIQUETA_ESTADO.DISPONIBLE,
  EN_USO: ETIQUETA_ESTADO.EN_USO,
  FUERA_DE_HORARIO: ETIQUETA_ESTADO.FUERA_DE_HORARIO,
  EN_MANTENIMIENTO: ETIQUETA_ESTADO.EN_MANTENIMIENTO,
  BLOQUEADO: ETIQUETA_ESTADO.BLOQUEADO,
};

const MODALIDAD_ITEMS: Record<string, string> = {
  TODOS: "Todas las modalidades",
  POOL: MEDIO_LABELS.POOL,
  ASIGNADO: MEDIO_LABELS.ASIGNADO,
};

export function FiltrosBar({ filtros, onFiltrosChange }: FiltrosBarProps) {
  const hayFiltrosActivos = filtros.territorio !== "TODOS" || filtros.estado !== "TODOS" || filtros.modalidad !== "TODOS";

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={filtros.territorio} onValueChange={(v) => onFiltrosChange({ territorio: v as FiltrosMapa["territorio"] })} items={TERRITORIO_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Territorio" /></SelectTrigger>
          <SelectContent>
            {Object.entries(TERRITORIO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.estado} onValueChange={(v) => onFiltrosChange({ estado: v as FiltrosMapa["estado"] })} items={ESTADO_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Estatus" /></SelectTrigger>
          <SelectContent>
            {Object.entries(ESTADO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.modalidad} onValueChange={(v) => onFiltrosChange({ modalidad: v as FiltrosMapa["modalidad"] })} items={MODALIDAD_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Modalidad" /></SelectTrigger>
          <SelectContent>
            {Object.entries(MODALIDAD_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hayFiltrosActivos && (
        <Button variant="ghost" size="sm" onClick={() => onFiltrosChange({ territorio: "TODOS", estado: "TODOS", modalidad: "TODOS" })}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
