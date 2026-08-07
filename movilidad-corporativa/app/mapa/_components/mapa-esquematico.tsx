"use client";

import { PARAMS_CONFIG } from "@/lib/config/params";
import { proyectarPosicion, type OrigenSolicitudMapa, type VehiculoMapa } from "@/lib/adapters/mapa";
import { COLOR_HEX_ESTADO, COLOR_ORIGEN_SOLICITUD } from "../_lib/estilos";

interface MapaEsquematicoProps {
  vehiculos: VehiculoMapa[];
  origenes: OrigenSolicitudMapa[];
  seleccionadoId: string | null;
  onSeleccionarVehiculo: (id: string) => void;
}

const LINEAS_GRID = [12.5, 25, 37.5, 50, 62.5, 75, 87.5];

/**
 * Mapa esquemático SIMULADO: no usa un proveedor cartográfico real. Los
 * territorios se ubican proyectando su latitud/longitud real (PARAMS_CONFIG)
 * sobre un lienzo rectangular a escala del bounding box de México; los
 * vehículos y orígenes de solicitud se dispersan alrededor con un
 * desplazamiento simulado (ver lib/adapters/mapa.ts).
 */
export function MapaEsquematico({ vehiculos, origenes, seleccionadoId, onSeleccionarVehiculo }: MapaEsquematicoProps) {
  return (
    <div className="relative aspect-[7/4] w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-slate-50">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {LINEAS_GRID.map((pos) => (
          <line key={`v-${pos}`} x1={pos} y1={0} x2={pos} y2={100} stroke="#e2e8f0" strokeWidth={0.3} />
        ))}
        {LINEAS_GRID.map((pos) => (
          <line key={`h-${pos}`} x1={0} y1={pos} x2={100} y2={pos} stroke="#e2e8f0" strokeWidth={0.3} />
        ))}
      </svg>

      <span className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
        Mapa simulado — demo
      </span>

      {Object.entries(PARAMS_CONFIG.territorios).map(([id, info]) => {
        const { xPorcentaje, yPorcentaje } = proyectarPosicion(info);
        return (
          <div
            key={id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${xPorcentaje}%`, top: `${yPorcentaje}%` }}
          >
            <div className="h-20 w-20 rounded-full border border-dashed border-slate-300/80 sm:h-24 sm:w-24" />
            <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">
              {info.nombre}
            </span>
          </div>
        );
      })}

      {origenes.map((origen) => {
        const { xPorcentaje, yPorcentaje } = proyectarPosicion(origen.posicion);
        return (
          <div
            key={origen.solicitud.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 rotate-45"
            style={{ left: `${xPorcentaje}%`, top: `${yPorcentaje}%`, backgroundColor: COLOR_ORIGEN_SOLICITUD }}
            title={`Solicitud ${origen.solicitud.folio} · ${origen.solicitanteNombre}`}
          >
            <div className="h-2 w-2" />
          </div>
        );
      })}

      {vehiculos.map((v) => {
        const { xPorcentaje, yPorcentaje } = proyectarPosicion(v.posicion);
        const seleccionado = v.vehiculo.id === seleccionadoId;
        return (
          <button
            key={v.vehiculo.id}
            type="button"
            onClick={() => onSeleccionarVehiculo(v.vehiculo.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition-transform hover:scale-125 ${
              seleccionado ? "z-20 h-4 w-4 ring-2 ring-slate-900 ring-offset-1" : "z-10 h-3 w-3"
            }`}
            style={{ left: `${xPorcentaje}%`, top: `${yPorcentaje}%`, backgroundColor: COLOR_HEX_ESTADO[v.estadoMapa] }}
            title={`${v.vehiculo.placa} · ${v.vehiculo.marca} ${v.vehiculo.modelo}`}
            aria-label={`Ver detalle de ${v.vehiculo.placa}`}
          />
        );
      })}
    </div>
  );
}
