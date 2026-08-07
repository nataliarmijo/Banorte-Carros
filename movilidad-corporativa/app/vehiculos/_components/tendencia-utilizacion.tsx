"use client";

import type { PuntoTendenciaUtilizacion } from "@/lib/services/servicio-flota";

/** Barras simples (sin librería externa) con los viajes por semana de las últimas semanas. */
export function TendenciaUtilizacion({ puntos }: { puntos: PuntoTendenciaUtilizacion[] }) {
  const maximo = Math.max(1, ...puntos.map((p) => p.viajes));

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      {puntos.map((punto) => (
        <div key={punto.etiqueta} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700">{punto.viajes}</span>
          <div className="flex h-24 w-full items-end rounded-lg bg-slate-100">
            <div
              className="w-full rounded-lg bg-slate-900 transition-all"
              style={{ height: `${(punto.viajes / maximo) * 100}%`, minHeight: punto.viajes > 0 ? "0.5rem" : 0 }}
            />
          </div>
          <span className="text-center text-[0.65rem] leading-tight text-slate-500">{punto.etiqueta}</span>
        </div>
      ))}
    </div>
  );
}
