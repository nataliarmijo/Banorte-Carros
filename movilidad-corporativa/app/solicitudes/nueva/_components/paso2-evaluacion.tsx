"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bus, Car, CheckCircle2, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/states";
import { useNuevaSolicitudStore } from "@/lib/stores/nueva-solicitud";
import {
  evaluarAlternativasParaSolicitud,
  calcularSaturacionFlotilla,
  resumenMantenimientoRelevante,
  type EvaluacionAlternativas,
} from "@/lib/adapters/flota";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { esResultadoSinDatos, type Alternativa } from "@/lib/services/types";
import { BadgeIntegracionSimulada } from "@/components/badge-integracion-simulada";
import { validarPaso1 } from "../_lib/schema";
import { combinarFechaHora, estimarDuracionMinutos, ALTERNATIVA_LABELS } from "../_lib/utils";

const ICONOS: Record<Alternativa, React.ComponentType<{ className?: string }>> = {
  POOL: Bus,
  ASIGNADO: Car,
  UBER: Car,
};

export function Paso2Evaluacion() {
  const { datos, alternativaSeleccionada, setAlternativaSeleccionada, irAPaso } = useNuevaSolicitudStore();
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [evaluacion, setEvaluacion] = useState<EvaluacionAlternativas | null>(null);
  const [mensajeError, setMensajeError] = useState("");

  useEffect(() => {
    const validado = validarPaso1(datos);
    if (!validado.exito) {
      irAPaso(1);
      return;
    }

    let cancelado = false;

    (async () => {
      const fechaSalida = combinarFechaHora(validado.datos.fechaSalida, validado.datos.horaSalida);
      const fechaRegreso = combinarFechaHora(validado.datos.fechaRegreso, validado.datos.horaRegreso);
      const duracionEstimadaMinutos = estimarDuracionMinutos(validado.datos.distanciaEstimadaKm);

      const evaluacionCalculada = await evaluarAlternativasParaSolicitud(
        {
          territorio: validado.datos.territorio,
          distanciaEstimadaKm: validado.datos.distanciaEstimadaKm,
          duracionEstimadaMinutos,
          fechaSalida,
          fechaRegreso,
          pasajeros: validado.datos.pasajeros,
          tipoVehiculoRequerido: validado.datos.tipoVehiculoRequerido,
        },
        PARAMS_CONFIG.limitesCostoEspecial.colaborador
      );

      if (cancelado) return;

      const { resultado } = evaluacionCalculada;
      if (esResultadoSinDatos(resultado)) {
        setMensajeError(resultado.detalle);
        setEstado("error");
        return;
      }

      setEvaluacion(evaluacionCalculada);
      setAlternativaSeleccionada(alternativaSeleccionada ?? resultado.recomendada);
      setEstado("listo");
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (estado === "cargando") {
    return <LoadingState message="Calculando costos, emisiones y disponibilidad..." />;
  }

  if (estado === "error" || !evaluacion || esResultadoSinDatos(evaluacion.resultado)) {
    return (
      <div className="space-y-4">
        <ErrorState title="Sin datos suficientes" description={mensajeError} />
        <Button variant="outline" onClick={() => irAPaso(1)}>
          Volver a información del viaje
        </Button>
      </div>
    );
  }

  const { resultado, vehiculosDisponibles, candidatos } = evaluacion;
  const distanciaKm = Number(datos.distanciaEstimadaKm) || 0;
  const duracionMinutos = estimarDuracionMinutos(distanciaKm);
  const saturacion = calcularSaturacionFlotilla(vehiculosDisponibles);
  const mantenimiento = resumenMantenimientoRelevante(candidatos);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-4 sm:p-6">
        <div>
          <p className="text-xs text-slate-500">Distancia</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{distanciaKm} km</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Duración estimada</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{duracionMinutos} min</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Saturación de flotilla</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{saturacion.etiqueta}</p>
          <p className="text-xs text-slate-500">
            {saturacion.disponibles}/{saturacion.total} unidades disponibles
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Mantenimiento</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{mantenimiento}</p>
        </div>
      </section>

      <section
        className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
          resultado.requiereAprobacionEspecial ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <div className="flex items-start gap-3">
          {resultado.requiereAprobacionEspecial ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Recomendación del sistema: {ALTERNATIVA_LABELS[resultado.recomendada]}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{resultado.explicacion}</p>
          </div>
        </div>
      </section>

      <section className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
        {resultado.alternativas.map((alt) => {
          const Icono = ICONOS[alt.tipo];
          const esRecomendada = alt.tipo === resultado.recomendada;
          const esSeleccionada = alt.tipo === alternativaSeleccionada;
          const puedeElegirse = alt.tipo === "UBER" || alt.disponible;

          return (
            <button
              key={alt.tipo}
              type="button"
              disabled={!puedeElegirse}
              onClick={() => setAlternativaSeleccionada(alt.tipo)}
              className={`min-w-[85%] shrink-0 snap-center rounded-3xl border p-5 text-left shadow-sm transition sm:min-w-0 ${
                esSeleccionada
                  ? "border-slate-900 bg-white ring-2 ring-slate-900"
                  : puedeElegirse
                    ? "border-slate-200 bg-white hover:border-slate-400"
                    : "border-slate-200 bg-slate-50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icono className="h-5 w-5 text-slate-500" />
                  <p className="font-semibold text-slate-900">{ALTERNATIVA_LABELS[alt.tipo]}</p>
                </div>
                {esRecomendada && <Badge>Recomendada</Badge>}
              </div>

              {alt.vehiculoNombre && <p className="mt-1 text-xs text-slate-500">{alt.vehiculoNombre}</p>}

              <p className="mt-4 text-2xl font-semibold text-slate-900">
                ${Math.round(alt.costo.costoTotal).toLocaleString("es-MX")} MXN
              </p>

              <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
                <Leaf className="h-4 w-4 text-emerald-600" />
                {alt.emisiones.totalKgCo2.toFixed(1)} kg CO₂
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {alt.tipo === "UBER" ? (
                  <>
                    <Badge variant="secondary">Siempre disponible</Badge>
                    <BadgeIntegracionSimulada titulo="La cotización de Uber es una simulación; no proviene de la API real de Uber for Business." />
                  </>
                ) : alt.disponible ? (
                  <Badge variant="secondary">Disponible</Badge>
                ) : (
                  <Badge variant="outline">No disponible</Badge>
                )}
              </div>

              {!puedeElegirse && alt.costo.notas[0] && (
                <p className="mt-2 text-xs text-slate-500">{alt.costo.notas[0]}</p>
              )}

              {esSeleccionada && (
                <p className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-900">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Seleccionada
                </p>
              )}
            </button>
          );
        })}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => irAPaso(1)}>
          Volver
        </Button>
        <Button size="lg" disabled={!alternativaSeleccionada} onClick={() => irAPaso(3)}>
          Continuar a confirmación
        </Button>
      </div>
    </div>
  );
}
