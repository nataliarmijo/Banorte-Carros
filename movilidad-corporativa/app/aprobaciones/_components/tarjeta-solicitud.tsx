"use client";

import { useState } from "react";
import { AlertTriangle, Clock3, Leaf, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MEDIO_ICONOS, MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import type { DecisionAprobador, SolicitudPendiente } from "@/lib/adapters/aprobaciones";

interface TarjetaSolicitudProps {
  item: SolicitudPendiente;
  procesando: boolean;
  onDecidir: (decision: DecisionAprobador, comentario: string) => Promise<void>;
}

export function TarjetaSolicitud({ item, procesando, onDecidir }: TarjetaSolicitudProps) {
  const { solicitud, resultado, motivoSinDatos, ahorroEstimado, esUrgente, solicitanteNombre, territorioNombre } = item;

  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
        solicitud.requiereAprobacionEspecial ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{solicitud.folio}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            {solicitud.origen} → {solicitud.destino}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <Users className="h-3.5 w-3.5" /> {solicitanteNombre} · {territorioNombre}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {esUrgente && (
            <Badge variant="destructive" className="gap-1">
              <Clock3 className="h-3 w-3" /> Salida próxima
            </Badge>
          )}
          {solicitud.requiereAprobacionEspecial && (
            <Badge variant="outline" className="gap-1 border-amber-300 text-amber-800">
              <AlertTriangle className="h-3 w-3" /> Aprobación especial
            </Badge>
          )}
        </div>
      </header>

      {solicitud.requiereAprobacionEspecial && solicitud.motivoAprobacionEspecial && (
        <p className="mt-2 text-xs text-amber-800">Motivo: {solicitud.motivoAprobacionEspecial}</p>
      )}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Motivo del viaje</dt>
          <dd className="font-medium text-slate-900">{solicitud.motivoViaje}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Fecha y hora</dt>
          <dd className="font-medium text-slate-900">
            {solicitud.fechaSolicitud} · {solicitud.horaInicioDeseada}–{solicitud.horaFinDeseada}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Duración estimada</dt>
          <dd className="font-medium text-slate-900">
            {solicitud.duracionEstimadaMinutos ? `${solicitud.duracionEstimadaMinutos} min` : "No especificada"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Distancia</dt>
          <dd className="font-medium text-slate-900">
            {solicitud.distanciaEstimadaKm ? `${solicitud.distanciaEstimadaKm} km` : "No especificada"}
          </dd>
        </div>
      </dl>

      {resultado ? (
        <>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Recomendación del sistema: {MEDIO_LABELS[resultado.recomendada]}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{resultado.explicacion}</p>
            {ahorroEstimado > 0 && (
              <p className="mt-2 text-sm font-medium text-emerald-700">
                Ahorro estimado: ${Math.round(ahorroEstimado).toLocaleString("es-MX")} MXN frente a la alternativa más cara
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {resultado.alternativas.map((alt) => {
              const Icono = MEDIO_ICONOS[alt.tipo];
              const esRecomendada = alt.tipo === resultado.recomendada;
              return (
                <div
                  key={alt.tipo}
                  className={`rounded-2xl border p-4 ${esRecomendada ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <Icono className="h-4 w-4 text-slate-500" />
                      {MEDIO_LABELS[alt.tipo]}
                    </div>
                    {esRecomendada && <Badge>Recomendada</Badge>}
                  </div>

                  {alt.vehiculoNombre && <p className="mt-1 text-xs text-slate-500">{alt.vehiculoNombre}</p>}

                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    ${Math.round(alt.costo.costoTotal).toLocaleString("es-MX")} MXN
                  </p>

                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                    <Leaf className="h-3.5 w-3.5 text-emerald-600" />
                    {alt.emisiones.totalKgCo2.toFixed(1)} kg CO₂
                  </p>

                  <div className="mt-2">
                    {alt.tipo === "UBER" ? (
                      <Badge variant="secondary">Siempre disponible</Badge>
                    ) : alt.disponible ? (
                      <Badge variant="secondary">Disponible</Badge>
                    ) : (
                      <Badge variant="outline">No disponible</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">No fue posible recalcular la comparación de alternativas.</p>
          <p className="mt-1 text-sm text-slate-600">{motivoSinDatos}</p>
          <p className="mt-2 text-sm text-slate-600">
            Medio solicitado: {MEDIO_LABELS[solicitud.modalidadRequerida]}
            {typeof solicitud.costoEstimado === "number" ? ` · $${Math.round(solicitud.costoEstimado).toLocaleString("es-MX")} MXN` : ""}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <DialogoDecision tipo="APROBAR" disabled={procesando} onConfirmar={(comentario) => onDecidir("APROBAR", comentario)} />
        <DialogoDecision
          tipo="SOLICITAR_CAMBIOS"
          disabled={procesando}
          onConfirmar={(comentario) => onDecidir("SOLICITAR_CAMBIOS", comentario)}
        />
        <DialogoDecision tipo="RECHAZAR" disabled={procesando} onConfirmar={(comentario) => onDecidir("RECHAZAR", comentario)} />
      </div>
    </article>
  );
}

const CONFIG_DIALOGO: Record<
  DecisionAprobador,
  {
    etiqueta: string;
    variant: "default" | "outline" | "destructive";
    titulo: string;
    descripcion: string;
    comentarioObligatorio: boolean;
    placeholder: string;
    confirmar: string;
  }
> = {
  APROBAR: {
    etiqueta: "Aprobar",
    variant: "default",
    titulo: "¿Aprobar esta solicitud?",
    descripcion:
      "Se ejecutará la asignación automática de vehículo si el medio recomendado es Pool o Asignado, o se aprobará directo si es Uber (cotización simulada).",
    comentarioObligatorio: false,
    placeholder: "Comentario opcional...",
    confirmar: "Aprobar solicitud",
  },
  RECHAZAR: {
    etiqueta: "Rechazar",
    variant: "destructive",
    titulo: "¿Rechazar esta solicitud?",
    descripcion: "El colaborador verá este comentario en Mis reservaciones.",
    comentarioObligatorio: true,
    placeholder: "Explica el motivo del rechazo (obligatorio)...",
    confirmar: "Rechazar solicitud",
  },
  SOLICITAR_CAMBIOS: {
    etiqueta: "Solicitar cambios",
    variant: "outline",
    titulo: "¿Solicitar cambios al colaborador?",
    descripcion: "La solicitud regresará a borrador y se notificará (simulado) al colaborador con tu comentario.",
    comentarioObligatorio: true,
    placeholder: "Indica qué debe ajustar el colaborador (obligatorio)...",
    confirmar: "Solicitar cambios",
  },
};

function DialogoDecision({
  tipo,
  onConfirmar,
  disabled,
}: {
  tipo: DecisionAprobador;
  onConfirmar: (comentario: string) => Promise<void>;
  disabled?: boolean;
}) {
  const config = CONFIG_DIALOGO[tipo];
  const [open, setOpen] = useState(false);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const comentarioValido = !config.comentarioObligatorio || comentario.trim().length > 0;

  async function confirmar() {
    setEnviando(true);
    try {
      await onConfirmar(comentario);
      setOpen(false);
      setComentario("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant={config.variant} disabled={disabled} />}>{config.etiqueta}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.titulo}</AlertDialogTitle>
          <AlertDialogDescription>{config.descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder={config.placeholder}
          rows={3}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant={config.variant} onClick={confirmar} disabled={enviando || !comentarioValido}>
            {enviando ? "Enviando..." : config.confirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
