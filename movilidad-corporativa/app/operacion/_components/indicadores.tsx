"use client";

import { AlertTriangle, CarFront, CheckCircle2, Clock3, Wrench } from "lucide-react";

interface IndicadoresProps {
  disponibles: number;
  enUso: number;
  devolucionesRetrasadas: number;
  enMantenimiento: number;
  incidenciasAbiertas: number;
}

const TARJETAS: {
  clave: keyof IndicadoresProps;
  etiqueta: string;
  icono: typeof CheckCircle2;
  clases: string;
}[] = [
  { clave: "disponibles", etiqueta: "Disponibles ahora", icono: CheckCircle2, clases: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { clave: "enUso", etiqueta: "En uso", icono: CarFront, clases: "border-blue-200 bg-blue-50 text-blue-800" },
  { clave: "devolucionesRetrasadas", etiqueta: "Devoluciones retrasadas", icono: Clock3, clases: "border-red-200 bg-red-50 text-red-800" },
  { clave: "enMantenimiento", etiqueta: "En mantenimiento", icono: Wrench, clases: "border-amber-200 bg-amber-50 text-amber-800" },
  { clave: "incidenciasAbiertas", etiqueta: "Incidencias abiertas", icono: AlertTriangle, clases: "border-orange-200 bg-orange-50 text-orange-800" },
];

export function Indicadores(props: IndicadoresProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {TARJETAS.map(({ clave, etiqueta, icono: Icono, clases }) => (
        <div key={clave} className={`rounded-3xl border p-4 shadow-sm ${clases}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{etiqueta}</p>
            <Icono className="h-4 w-4" />
          </div>
          <p className="mt-2 text-3xl font-semibold">{props[clave]}</p>
        </div>
      ))}
    </section>
  );
}
