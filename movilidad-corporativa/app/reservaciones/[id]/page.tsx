"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Ban, CheckCircle2, Circle, Gauge, Leaf, PlayCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/states";
import { initializeDemoData } from "@/lib/seed/init";
import { useSessionStore } from "@/lib/stores/session";
import {
  cancelarSolicitud,
  esCancelable,
  obtenerDetalleSolicitud,
  type DetalleSolicitud,
} from "@/lib/adapters/reservaciones";
import { esResultadoSinDatos } from "@/lib/services/types";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import { EstadoBadge } from "@/components/estado-badge";

function formatearFecha(fechaISO: string | null): string {
  if (!fechaISO) return "Pendiente";
  return new Date(fechaISO).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default function DetalleReservacionPage() {
  const params = useParams<{ id: string }>();
  const solicitudId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { usuarioActivo } = useSessionStore();

  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [detalle, setDetalle] = useState<DetalleSolicitud | null>(null);
  const [mensajeError, setMensajeError] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const data = await obtenerDetalleSolicitud(solicitudId);
      if (!data) {
        setMensajeError("No se encontró la solicitud solicitada.");
        setEstado("error");
        return;
      }
      setDetalle(data);
      setEstado("listo");
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar el detalle.");
      setEstado("error");
    }
  }, [solicitudId]);

  useEffect(() => {
    initializeDemoData().then(cargar);
  }, [cargar]);

  async function manejarCancelar() {
    if (!usuarioActivo || !detalle) return;
    setCancelando(true);
    setErrorCancelar(null);
    try {
      const resultado = await cancelarSolicitud(detalle.solicitud.id, usuarioActivo.id);
      if (esResultadoSinDatos(resultado)) {
        setErrorCancelar(resultado.detalle);
        return;
      }
      await cargar();
    } finally {
      setCancelando(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Link href="/reservaciones" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Volver a Mis reservaciones
        </Link>

        {estado === "cargando" && <LoadingState message="Cargando detalle de la solicitud..." />}
        {estado === "error" && <ErrorState description={mensajeError} />}

        {estado === "listo" && detalle && (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{detalle.solicitud.folio}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                    {detalle.solicitud.origen} → {detalle.solicitud.destino}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {detalle.solicitanteNombre} · {detalle.territorioNombre}
                  </p>
                </div>
                <EstadoBadge estado={detalle.solicitud.estadoSolicitud} className="text-sm" />
              </div>

              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Fecha y hora</dt>
                  <dd className="font-medium text-slate-900">
                    {detalle.solicitud.fechaSolicitud} · {detalle.solicitud.horaInicioDeseada}–{detalle.solicitud.horaFinDeseada}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Motivo</dt>
                  <dd className="font-medium text-slate-900">{detalle.solicitud.motivoViaje}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Medio</dt>
                  <dd className="font-medium text-slate-900">{MEDIO_LABELS[detalle.solicitud.modalidadRequerida]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Vehículo</dt>
                  <dd className="font-medium text-slate-900">{detalle.vehiculoNombre ?? "Aún sin asignar"}</dd>
                </div>
              </dl>

              {detalle.solicitud.requiereAprobacionEspecial && detalle.solicitud.motivoAprobacionEspecial && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Requirió aprobación especial: {detalle.solicitud.motivoAprobacionEspecial}</p>
                </div>
              )}

              {errorCancelar && <ErrorState title="No se pudo cancelar" description={errorCancelar} />}

              {detalle.solicitud.usuarioSolicitanteId === usuarioActivo?.id && esCancelable(detalle.solicitud) && (
                <div className="mt-5">
                  <Button variant="destructive" onClick={manejarCancelar} disabled={cancelando}>
                    <Ban className="h-3.5 w-3.5" /> {cancelando ? "Cancelando..." : "Cancelar solicitud"}
                  </Button>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Trazabilidad del viaje</h3>
              <ol className="mt-4 space-y-4">
                {detalle.timeline.map((hito) => (
                  <li key={hito.clave} className="flex items-start gap-3">
                    {hito.estado === "completado" ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : hito.estado === "actual" ? (
                      <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                    )}
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          hito.estado === "pendiente" ? "text-slate-400" : "text-slate-900"
                        }`}
                      >
                        {hito.titulo}
                      </p>
                      <p className="text-xs text-slate-500">{formatearFecha(hito.fecha)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {detalle.checkOut && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-slate-500" />
                  <h3 className="text-base font-semibold text-slate-900">Resumen real del viaje</h3>
                </div>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs text-slate-500">Km recorridos</dt>
                    <dd className="font-medium text-slate-900">{detalle.checkOut.kilometrosRecorridos} km</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Duración real</dt>
                    <dd className="font-medium text-slate-900">
                      {Math.floor(detalle.checkOut.duracionRealMinutos / 60)}h {detalle.checkOut.duracionRealMinutos % 60}min
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Retraso frente al regreso planeado</dt>
                    <dd className="font-medium text-slate-900">
                      {detalle.checkOut.retrasoMinutos > 0 ? `${detalle.checkOut.retrasoMinutos} min` : "Sin retraso"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Combustible consumido vs. esperado</dt>
                    <dd className="font-medium text-slate-900">
                      {detalle.checkOut.diferenciaCombustiblePorcentaje > 0 ? "+" : ""}
                      {detalle.checkOut.diferenciaCombustiblePorcentaje} pts
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Costo real vs. estimado</dt>
                    <dd className="font-medium text-slate-900">
                      ${Math.round(detalle.checkOut.costoReal).toLocaleString("es-MX")} MXN
                      {typeof detalle.solicitud.costoEstimado === "number" && (
                        <span className="text-slate-500"> (est. ${Math.round(detalle.solicitud.costoEstimado).toLocaleString("es-MX")})</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-slate-500">
                      <Leaf className="h-3 w-3" /> Emisiones reales
                    </dt>
                    <dd className="font-medium text-slate-900">{(detalle.checkOut.emisionesRealesGramos / 1000).toFixed(1)} kg CO₂</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Estado del vehículo al devolver</dt>
                    <dd className="font-medium text-slate-900">
                      {detalle.checkOut.estadoVehiculo === "BUENO"
                        ? "Bueno"
                        : detalle.checkOut.estadoVehiculo === "CON_OBSERVACIONES"
                          ? "Con observaciones"
                          : "Con daños"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Llaves devueltas</dt>
                    <dd className="font-medium text-slate-900">{detalle.checkOut.llavesDevueltas ? "Sí" : "No"}</dd>
                  </div>
                </dl>

                {detalle.checkOut.danosDescripcion && (
                  <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Daños reportados: {detalle.checkOut.danosDescripcion}</p>
                  </div>
                )}

                {detalle.checkOut.fueraDeHorarioNoAutorizado && (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>El uso ocurrió fuera de horario laboral o en fin de semana sin autorización previa.</p>
                  </div>
                )}

                {detalle.checkOut.incidenciasCreadasIds.length > 0 && (
                  <p className="mt-3 text-xs text-slate-500">
                    Se generaron {detalle.checkOut.incidenciasCreadasIds.length} incidencia(s) automáticamente a partir de este check-out.
                  </p>
                )}
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Historial de decisiones</h3>
              {detalle.historial.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Todavía no hay decisiones registradas para esta solicitud.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {detalle.historial.map((item, idx) => (
                    <li key={`${item.tipo}-${idx}`} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{item.titulo}</p>
                        <p className="text-xs text-slate-500">{formatearFecha(item.fecha)}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{item.detalle}</p>
                      <p className="mt-1 text-xs text-slate-500">Por: {item.usuarioNombre}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
