"use client";

import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNuevaSolicitudStore } from "@/lib/stores/nueva-solicitud";
import { useSessionStore } from "@/lib/stores/session";

export function PantallaExito() {
  const { resultadoExito, reiniciar } = useNuevaSolicitudStore();
  const { territorioActivo } = useSessionStore();

  if (!resultadoExito) return null;

  const asignada = resultadoExito.estado === "ASIGNADA";

  return (
    <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      {asignada ? (
        <CheckCircle2 className="h-14 w-14 text-emerald-600" />
      ) : (
        <Clock3 className="h-14 w-14 text-amber-600" />
      )}

      <h2 className="mt-4 text-xl font-semibold text-slate-900">Solicitud enviada correctamente</h2>
      <p className="mt-2 text-sm text-slate-600">
        Tu folio es <span className="font-mono font-semibold text-slate-900">{resultadoExito.folio}</span>
      </p>

      <div className="mt-4 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-800">
        {asignada ? `Vehículo asignado${resultadoExito.vehiculoAsignadoNombre ? `: ${resultadoExito.vehiculoAsignadoNombre}` : ""}` : "Pendiente de aprobación"}
      </div>

      <p className="mt-4 max-w-md text-sm text-slate-600">
        {asignada
          ? "Tu viaje quedó reservado. Podrás ver el detalle y el seguimiento en Mis reservaciones."
          : "Tu solicitud fue enviada a tu aprobador. Te notificaremos en cuanto haya una decisión."}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" nativeButton={false} render={<Link href="/reservaciones">Ir a Mis reservaciones</Link>} />
        <Button variant="outline" size="lg" onClick={() => reiniciar(territorioActivo)}>
          Crear otra solicitud
        </Button>
      </div>
    </div>
  );
}
