"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADO_LABELS, ESTADOS_SOLICITUD, MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { MODALIDADES_FLOTA } from "@/lib/adapters/operacion";
import type { FiltrosOperacion } from "../_lib/filtros";

interface FiltrosBarProps {
  fecha: string;
  onFechaChange: (fecha: string) => void;
  filtros: FiltrosOperacion;
  onFiltrosChange: (patch: Partial<FiltrosOperacion>) => void;
  tiposVehiculo: string[];
  responsables: { id: string; nombre: string }[];
}

const TERRITORIO_ITEMS: Record<string, string> = {
  TODOS: "Todos los territorios",
  ...Object.fromEntries(Object.entries(PARAMS_CONFIG.territorios).map(([id, info]) => [id, info.nombre])),
};

const MODALIDAD_ITEMS: Record<string, string> = {
  TODOS: "Todas las modalidades",
  ...Object.fromEntries(MODALIDADES_FLOTA.map((m) => [m, MEDIO_LABELS[m]])),
};

const ESTADO_ITEMS: Record<string, string> = {
  TODOS: "Todos los estados",
  ...Object.fromEntries(ESTADOS_SOLICITUD.map((e) => [e, ESTADO_LABELS[e]])),
};

export function FiltrosBar({ fecha, onFechaChange, filtros, onFiltrosChange, tiposVehiculo, responsables }: FiltrosBarProps) {
  const tipoVehiculoItems: Record<string, string> = {
    TODOS: "Todos los tipos",
    ...Object.fromEntries(tiposVehiculo.map((t) => [t, t])),
  };
  const responsableItems: Record<string, string> = {
    TODOS: "Todos los colaboradores",
    ...Object.fromEntries(responsables.map((r) => [r.id, r.nombre])),
  };

  const hayFiltrosActivos =
    filtros.territorio !== "TODOS" ||
    filtros.tipoVehiculo !== "TODOS" ||
    filtros.modalidad !== "TODOS" ||
    filtros.estado !== "TODOS" ||
    filtros.responsable !== "TODOS";

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1">
          <Label htmlFor="fecha-panel" className="text-xs text-slate-500">
            Fecha
          </Label>
          <Input id="fecha-panel" type="date" value={fecha} onChange={(e) => onFechaChange(e.target.value)} />
        </div>

        <Select value={filtros.territorio} onValueChange={(v) => onFiltrosChange({ territorio: v as FiltrosOperacion["territorio"] })} items={TERRITORIO_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Territorio" /></SelectTrigger>
          <SelectContent>
            {Object.entries(TERRITORIO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.tipoVehiculo} onValueChange={(v) => onFiltrosChange({ tipoVehiculo: v as FiltrosOperacion["tipoVehiculo"] })} items={tipoVehiculoItems}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Tipo de vehículo" /></SelectTrigger>
          <SelectContent>
            {Object.entries(tipoVehiculoItems).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.modalidad} onValueChange={(v) => onFiltrosChange({ modalidad: v as FiltrosOperacion["modalidad"] })} items={MODALIDAD_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Modalidad" /></SelectTrigger>
          <SelectContent>
            {Object.entries(MODALIDAD_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.estado} onValueChange={(v) => onFiltrosChange({ estado: v as FiltrosOperacion["estado"] })} items={ESTADO_ITEMS}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            {Object.entries(ESTADO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.responsable} onValueChange={(v) => onFiltrosChange({ responsable: v as FiltrosOperacion["responsable"] })} items={responsableItems}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Colaborador" /></SelectTrigger>
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
          onClick={() => onFiltrosChange({ territorio: "TODOS", tipoVehiculo: "TODOS", modalidad: "TODOS", estado: "TODOS", responsable: "TODOS" })}
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
