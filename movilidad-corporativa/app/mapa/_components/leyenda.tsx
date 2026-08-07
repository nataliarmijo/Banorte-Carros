"use client";

import type { EstadoMapaVehiculo } from "@/lib/adapters/mapa";
import { COLOR_HEX_ESTADO, COLOR_ORIGEN_SOLICITUD, ETIQUETA_ESTADO } from "../_lib/estilos";

const ORDEN: EstadoMapaVehiculo[] = ["DISPONIBLE", "EN_USO", "FUERA_DE_HORARIO", "EN_MANTENIMIENTO", "BLOQUEADO"];

export function Leyenda() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
      {ORDEN.map((estado) => (
        <span key={estado} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_HEX_ESTADO[estado] }} />
          {ETIQUETA_ESTADO[estado]}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rotate-45" style={{ backgroundColor: COLOR_ORIGEN_SOLICITUD }} />
        Origen de solicitud activa
      </span>
    </div>
  );
}
