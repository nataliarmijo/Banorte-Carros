"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/states";
import { initializeDemoData } from "@/lib/seed/init";
import { useNuevaSolicitudStore } from "@/lib/stores/nueva-solicitud";
import { Stepper } from "./_components/stepper";
import { Paso1Informacion } from "./_components/paso1-informacion";
import { Paso2Evaluacion } from "./_components/paso2-evaluacion";
import { Paso3Confirmacion } from "./_components/paso3-confirmacion";
import { PantallaExito } from "./_components/pantalla-exito";

export default function NuevaSolicitudPage() {
  const { paso } = useNuevaSolicitudStore();
  const [listoParaOperar, setListoParaOperar] = useState(false);

  useEffect(() => {
    initializeDemoData().then(() => setListoParaOperar(true));
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Nueva solicitud</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Reserva tu próximo viaje corporativo</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Captura los datos del viaje, revisa la recomendación del sistema entre Pool, Asignado y Uber, y confirma
            tu solicitud. Tu progreso se guarda automáticamente como borrador si sales del flujo.
          </p>

          {paso !== "exito" && (
            <div className="mt-6">
              <Stepper pasoActual={paso} />
            </div>
          )}
        </section>

        {!listoParaOperar ? (
          <LoadingState message="Preparando datos de la flotilla..." />
        ) : (
          <>
            {paso === 1 && <Paso1Informacion />}
            {paso === 2 && <Paso2Evaluacion />}
            {paso === 3 && <Paso3Confirmacion />}
            {paso === "exito" && <PantallaExito />}
          </>
        )}
      </div>
    </AppShell>
  );
}
