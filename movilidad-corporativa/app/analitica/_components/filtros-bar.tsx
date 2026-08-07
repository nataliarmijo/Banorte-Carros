"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import type { OpcionesFiltroAnalitica } from "@/lib/adapters/analitica";
import { COMBUSTIBLE_LABELS, FILTROS_INICIALES, PERIODO_PRESET_LABELS, TIPO_VEHICULO_LABELS, type FiltrosUI } from "../_lib/filtros";

interface FiltrosBarProps {
  filtros: FiltrosUI;
  onFiltrosChange: (patch: Partial<FiltrosUI>) => void;
  opciones: OpcionesFiltroAnalitica;
}

function CampoSelect({
  etiqueta,
  valor,
  onChange,
  items,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  items: Record<string, string>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">{etiqueta}</span>
      <Select value={valor} onValueChange={(v) => onChange(v ?? "")} items={items}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function FiltrosBar({ filtros, onFiltrosChange, opciones }: FiltrosBarProps) {
  const territorioItems: Record<string, string> = {
    TODOS: "Todos los territorios",
    ...Object.fromEntries(opciones.territorios.map((t) => [t.id, t.nombre])),
  };
  const modalidadItems: Record<string, string> = {
    TODOS: "Todas",
    ...Object.fromEntries(opciones.modalidades.map((m) => [m, MEDIO_LABELS[m]])),
  };
  const tipoVehiculoItems: Record<string, string> = {
    TODOS: "Todos los tipos",
    ...Object.fromEntries(opciones.tiposVehiculo.map((t) => [t, TIPO_VEHICULO_LABELS[t]])),
  };
  const combustibleItems: Record<string, string> = {
    TODOS: "Todos los combustibles",
    ...Object.fromEntries(opciones.combustibles.map((c) => [c, COMBUSTIBLE_LABELS[c]])),
  };
  const medioTransporteItems: Record<string, string> = {
    TODOS: "Todos",
    ...Object.fromEntries(opciones.mediosTransporte.map((m) => [m, MEDIO_LABELS[m]])),
  };
  const areaItems: Record<string, string> = {
    TODOS: "Todas las áreas",
    ...Object.fromEntries(opciones.areas.map((a) => [a, a])),
  };
  const tipoViajeItems: Record<string, string> = {
    TODOS: "Todos los tipos de viaje",
    ...Object.fromEntries(opciones.tiposViaje.map((t) => [t, t])),
  };

  const hayFiltrosActivos =
    filtros.territorio !== "TODOS" ||
    filtros.modalidad !== "TODOS" ||
    filtros.tipoVehiculo !== "TODOS" ||
    filtros.combustible !== "TODOS" ||
    filtros.medioTransporte !== "TODOS" ||
    filtros.area !== "TODOS" ||
    filtros.tipoViaje !== "TODOS" ||
    filtros.periodo !== FILTROS_INICIALES.periodo;

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <CampoSelect etiqueta="Periodo" valor={filtros.periodo} onChange={(v) => onFiltrosChange({ periodo: v as FiltrosUI["periodo"] })} items={PERIODO_PRESET_LABELS} />
        <CampoSelect etiqueta="Territorio" valor={filtros.territorio} onChange={(v) => onFiltrosChange({ territorio: v })} items={territorioItems} />
        <CampoSelect etiqueta="Modalidad" valor={filtros.modalidad} onChange={(v) => onFiltrosChange({ modalidad: v as FiltrosUI["modalidad"] })} items={modalidadItems} />
        <CampoSelect etiqueta="Tipo de vehículo" valor={filtros.tipoVehiculo} onChange={(v) => onFiltrosChange({ tipoVehiculo: v as FiltrosUI["tipoVehiculo"] })} items={tipoVehiculoItems} />
        <CampoSelect etiqueta="Combustible" valor={filtros.combustible} onChange={(v) => onFiltrosChange({ combustible: v as FiltrosUI["combustible"] })} items={combustibleItems} />
        <CampoSelect etiqueta="Medio de transporte" valor={filtros.medioTransporte} onChange={(v) => onFiltrosChange({ medioTransporte: v as FiltrosUI["medioTransporte"] })} items={medioTransporteItems} />
        <CampoSelect etiqueta="Área / departamento" valor={filtros.area} onChange={(v) => onFiltrosChange({ area: v })} items={areaItems} />
        <CampoSelect etiqueta="Tipo de viaje" valor={filtros.tipoViaje} onChange={(v) => onFiltrosChange({ tipoViaje: v })} items={tipoViajeItems} />
      </div>

      {hayFiltrosActivos && (
        <Button variant="ghost" size="sm" onClick={() => onFiltrosChange(FILTROS_INICIALES)}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
