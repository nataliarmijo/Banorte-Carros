"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import type { VehiculoMapa } from "@/lib/adapters/mapa";
import { ESTILO_BADGE_ESTADO, ETIQUETA_ESTADO } from "../_lib/estilos";

interface ListaVehiculosProps {
  vehiculos: VehiculoMapa[];
  seleccionadoId: string | null;
  onSeleccionarVehiculo: (id: string) => void;
}

export function ListaVehiculos({ vehiculos, seleccionadoId, onSeleccionarVehiculo }: ListaVehiculosProps) {
  if (vehiculos.length === 0) {
    return <p className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No hay vehículos que coincidan con los filtros.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {vehiculos.map((v) => {
        const seleccionado = v.vehiculo.id === seleccionadoId;
        return (
          <button
            key={v.vehiculo.id}
            type="button"
            onClick={() => onSeleccionarVehiculo(v.vehiculo.id)}
            className={`rounded-2xl border p-3 text-left text-sm transition ${
              seleccionado ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-200 bg-white hover:border-slate-400"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-900">{v.vehiculo.placa}</p>
              <Badge variant="outline" className={`border-transparent text-[0.65rem] font-medium ${ESTILO_BADGE_ESTADO[v.estadoMapa]}`}>
                {ETIQUETA_ESTADO[v.estadoMapa]}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {v.vehiculo.marca} {v.vehiculo.modelo} · {MEDIO_LABELS[v.vehiculo.modalidad]}
            </p>
            <p className="mt-1 text-xs text-slate-500">{v.territorioNombre}</p>
            {v.conductorActualNombre && <p className="mt-1 text-xs text-slate-600">Conduce: {v.conductorActualNombre}</p>}
          </button>
        );
      })}

      {vehiculos.some((v) => v.estadoMapa === "BLOQUEADO") && (
        <p className="col-span-full flex items-center gap-1.5 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" /> Hay vehículos bloqueados en esta vista.
        </p>
      )}
    </div>
  );
}
