"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, CheckCircle2, FolderOpen, MapPin, MessageSquarePlus, User } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/states";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initializeDemoData } from "@/lib/seed/init";
import { db } from "@/lib/repositories/dexie";
import { useSessionStore } from "@/lib/stores/session";
import {
  agregarComentarioBitacora,
  asignarResponsable,
  obtenerDetalleIncidencia,
  type DetalleIncidencia,
} from "@/lib/adapters/incidencias";
import { esResultadoSinDatos } from "@/lib/services/types";
import { toast } from "@/lib/toast";
import {
  ESTADO_INCIDENCIA_ESTILOS,
  ESTADO_INCIDENCIA_LABELS,
  SEVERIDAD_ESTILOS,
  SEVERIDAD_LABELS,
  TIPO_INCIDENCIA_LABELS,
} from "@/lib/ui/incidencias";
import { DialogoCambiarEstado } from "../_components/dialogo-cambiar-estado";

function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default function DetalleIncidenciaPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { usuarioActivo } = useSessionStore();

  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [detalle, setDetalle] = useState<DetalleIncidencia | null>(null);
  const [mensajeError, setMensajeError] = useState("");
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([]);

  const [comentario, setComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [errorComentario, setErrorComentario] = useState<string | null>(null);

  const [responsableSeleccionado, setResponsableSeleccionado] = useState("");
  const [enviandoResponsable, setEnviandoResponsable] = useState(false);
  const [errorResponsable, setErrorResponsable] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const [data, usuariosDb] = await Promise.all([obtenerDetalleIncidencia(id), db.usuarios.toArray()]);
      if (!data) {
        setMensajeError("No se encontró la incidencia solicitada.");
        setEstado("error");
        return;
      }
      setDetalle(data);
      setUsuarios(usuariosDb.map((u) => ({ id: u.id, nombre: u.nombreCompleto })));
      setResponsableSeleccionado(data.incidencia.responsableId ?? "");
      setEstado("listo");
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar la incidencia.");
      setEstado("error");
    }
  }, [id]);

  useEffect(() => {
    initializeDemoData().then(cargar);
  }, [cargar]);

  async function manejarComentario() {
    if (!usuarioActivo || comentario.trim().length === 0) return;
    setEnviandoComentario(true);
    setErrorComentario(null);
    try {
      const resultado = await agregarComentarioBitacora(id, comentario, usuarioActivo.id);
      if (esResultadoSinDatos(resultado)) {
        setErrorComentario(resultado.detalle);
        toast.error("No se pudo agregar el comentario", resultado.detalle);
        return;
      }
      toast.success("Comentario agregado a la bitácora");
      setComentario("");
      await cargar();
    } finally {
      setEnviandoComentario(false);
    }
  }

  async function manejarResponsable() {
    if (!usuarioActivo || !responsableSeleccionado) return;
    setEnviandoResponsable(true);
    setErrorResponsable(null);
    try {
      const resultado = await asignarResponsable(id, responsableSeleccionado, usuarioActivo.id);
      if (esResultadoSinDatos(resultado)) {
        setErrorResponsable(resultado.detalle);
        toast.error("No se pudo asignar el responsable", resultado.detalle);
        return;
      }
      toast.success("Responsable asignado");
      await cargar();
    } finally {
      setEnviandoResponsable(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Link href="/incidencias" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Volver a incidencias
        </Link>

        {estado === "cargando" && <LoadingState message="Cargando incidencia..." />}
        {estado === "error" && <ErrorState description={mensajeError} />}

        {estado === "listo" && detalle && usuarioActivo && (
          <>
            <section
              className={`rounded-3xl border p-6 shadow-sm ${
                detalle.incidencia.severidad === "CRITICA" ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {TIPO_INCIDENCIA_LABELS[detalle.incidencia.tipoIncidencia]}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    {detalle.vehiculo ? `${detalle.vehiculo.marca} ${detalle.vehiculo.modelo} (${detalle.vehiculo.placa})` : "Vehículo desconocido"}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`border-transparent font-medium ${SEVERIDAD_ESTILOS[detalle.incidencia.severidad]}`}>
                    {SEVERIDAD_LABELS[detalle.incidencia.severidad]}
                  </Badge>
                  <Badge variant="outline" className={`border-transparent font-medium ${ESTADO_INCIDENCIA_ESTILOS[detalle.incidencia.estadoIncidencia]}`}>
                    {ESTADO_INCIDENCIA_LABELS[detalle.incidencia.estadoIncidencia]}
                  </Badge>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-700">{detalle.incidencia.descripcion}</p>

              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-500">Territorio</dt>
                    <dd className="font-medium text-slate-900">{detalle.territorioNombre}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-500">Folio de origen</dt>
                    <dd className="font-medium text-slate-900">{detalle.folioSolicitud ?? "No aplica"}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-500">Reportada por</dt>
                    <dd className="font-medium text-slate-900">{detalle.reportadoPorNombre}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-500">Fecha compromiso de resolución</dt>
                    <dd className="font-medium text-slate-900">{detalle.incidencia.fechaCompromiso ?? "Sin definir"}</dd>
                  </div>
                </div>
              </dl>

              {detalle.incidencia.fotos.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs text-slate-500">Evidencia fotográfica</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {detalle.incidencia.fotos.map((foto, indice) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={indice} src={foto} alt={`Evidencia ${indice + 1}`} className="aspect-square rounded-xl border border-slate-200 object-cover" />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {detalle.incidencia.estadoIncidencia === "ABIERTA" && (
                  <DialogoCambiarEstado
                    incidenciaId={id}
                    nuevoEstado="EN_PROCESO"
                    usuarioId={usuarioActivo.id}
                    onConfirmado={cargar}
                    trigger={<Button variant="outline">Marcar en proceso</Button>}
                  />
                )}
                {(detalle.incidencia.estadoIncidencia === "ABIERTA" || detalle.incidencia.estadoIncidencia === "EN_PROCESO") && (
                  <DialogoCambiarEstado
                    incidenciaId={id}
                    nuevoEstado="RESUELTA"
                    usuarioId={usuarioActivo.id}
                    onConfirmado={cargar}
                    trigger={
                      <Button>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Marcar resuelta
                      </Button>
                    }
                  />
                )}
                {detalle.incidencia.estadoIncidencia === "RESUELTA" && (
                  <DialogoCambiarEstado
                    incidenciaId={id}
                    nuevoEstado="CERRADA"
                    usuarioId={usuarioActivo.id}
                    onConfirmado={cargar}
                    trigger={<Button variant="outline">Cerrar incidencia</Button>}
                  />
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-sm font-semibold text-slate-900">Responsable asignado</h3>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="min-w-[14rem] flex-1 space-y-1.5">
                  <Select value={responsableSeleccionado || "NINGUNO"} onValueChange={(v) => setResponsableSeleccionado(v === "NINGUNO" ? "" : (v as string))} items={{ NINGUNO: "Sin asignar", ...Object.fromEntries(usuarios.map((u) => [u.id, u.nombre])) }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona un responsable" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NINGUNO">Sin asignar</SelectItem>
                      {usuarios.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={manejarResponsable}
                  disabled={enviandoResponsable || !responsableSeleccionado || responsableSeleccionado === detalle.incidencia.responsableId}
                >
                  {enviandoResponsable ? "Guardando..." : "Asignar"}
                </Button>
              </div>
              {errorResponsable && <p className="mt-2 text-xs text-red-700">{errorResponsable}</p>}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-sm font-semibold text-slate-900">Bitácora</h3>
              <ul className="mt-3 space-y-3">
                {detalle.bitacora.map((entrada) => (
                  <li key={entrada.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{entrada.usuarioNombre}</p>
                      <p className="text-xs text-slate-500">{formatearFecha(entrada.fecha)}</p>
                    </div>
                    <p className="mt-1 text-slate-700">{entrada.comentario}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Agregar un comentario a la bitácora..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={2}
                />
                {errorComentario && <p className="text-xs text-red-700">{errorComentario}</p>}
                <div className="flex justify-end">
                  <Button size="sm" onClick={manejarComentario} disabled={enviandoComentario || comentario.trim().length === 0}>
                    <MessageSquarePlus className="h-3.5 w-3.5" /> {enviandoComentario ? "Guardando..." : "Agregar comentario"}
                  </Button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
