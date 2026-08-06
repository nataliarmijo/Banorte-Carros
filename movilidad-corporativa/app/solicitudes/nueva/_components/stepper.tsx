import { Check } from "lucide-react";
import type { PasoWizard } from "@/lib/stores/nueva-solicitud";

const PASOS = [
  { numero: 1 as const, titulo: "Información del viaje" },
  { numero: 2 as const, titulo: "Evaluación inteligente" },
  { numero: 3 as const, titulo: "Confirmación" },
];

export function Stepper({ pasoActual }: { pasoActual: PasoWizard }) {
  const actual = pasoActual === "exito" ? 4 : pasoActual;

  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {PASOS.map((paso, index) => {
        const completado = actual > paso.numero;
        const activo = actual === paso.numero;
        return (
          <li key={paso.numero} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                completado
                  ? "bg-emerald-600 text-white"
                  : activo
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {completado ? <Check className="h-4 w-4" /> : paso.numero}
            </div>
            <span
              className={`hidden text-sm font-medium sm:block ${activo ? "text-slate-900" : "text-slate-500"}`}
            >
              {paso.titulo}
            </span>
            {index < PASOS.length - 1 && (
              <div className={`h-px flex-1 ${completado ? "bg-emerald-600" : "bg-slate-200"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
