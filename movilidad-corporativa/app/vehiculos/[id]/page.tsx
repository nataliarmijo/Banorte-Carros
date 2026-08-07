"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Gauge, Pencil, User, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initializeDemoData } from "@/lib/seed/init";
import { db } from "@/lib/repositories/dexie";
import { useSessionStore } from "@/lib/stores/session";
import {
  actualizarVehiculo,
  esModalidadFlota,
  obtenerDetalleVehiculo,
  type DetalleVehiculo,
} from "@/lib/adapters/vehiculos";
import { esResultadoSinDatos } from "@/lib/services/types";
import { toast } from "@/lib/toast";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import { FormularioVehiculo, type DatosVehiculoBorrador } from "../_components/formulario-vehiculo";
import type { DatosVehiculoValidados } from "../_lib/schema";
import { DialogoBloqueo } from "../_components/dialogo-bloqueo";
import { DialogoTerritorio } from "../_components/dialogo-territorio";
import { DialogoModalidad } from "../_components/dialogo-modalidad";
import { DialogoMantenimiento } from "../_components/dialogo-mantenimiento";
import { TendenciaUtilizacion } from "../_components/tendencia-utilizacion";

const ESTILOS_ESTADO: Record<string, string> = {
  DISPONIBLE: "bg-emerald-100 text-emerald-800",
  OCUPADO: "bg-blue-100 text-blue-800",
  EN_MANTENIMIENTO: "bg-amber-100 text-amber-800",
  FUERA_DE_SERVICIO: "bg-red-100 text-red-700",
};
const ETIQUETAS_ESTADO: Record<string, string> = {
  DISPONIBLE: "Disponible",
  OCUPADO: "En uso",
  EN_MANTENIMIENTO: "En mantenimiento",
  FUERA_DE_SERVICIO: "Bloqueado",
};
const ETIQUETAS_ACCION: Record<string, string> = {
  CREAR: "Alta en catálogo",
  CAMBIO_TERRITORIO: "Cambio de territorio",
  CAMBIO_MODALIDAD: "Cambio de modalidad",
  BLOQUEO: "Bloqueo",
  DESBLOQUEO: "Desbloqueo",
  MANTENIMIENTO_PROGRAMADO: "Mantenimiento programado",
};

function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function detalleADatosBorrador(detalle: DetalleVehiculo): DatosVehiculoBorrador {
  const { vehiculo } = detalle;
  return {
    placa: vehiculo.placa,
    marca: vehiculo.marca,
    modelo: vehiculo.modelo,
    anio: String(vehiculo.anio),
    tipoVehiculo: vehiculo.tipoVehiculo,
    modalidad: vehiculo.modalidad === "ASIGNADO" ? "ASIGNADO" : "POOL",
    territorio: vehiculo.territorioId,
    ubicacion: vehiculo.ubicacion,
    capacidadPasajeros: String(vehiculo.capacidadPasajeros),
    combustibleTipo: vehiculo.combustibleTipo,
    kilometrajeActual: String(vehiculo.kilometrajeActual),
    rendimientoKmPorLitro: String(vehiculo.rendimientoKmPorLitro),
    costoPorKm: String(vehiculo.costoPorKm),
    usuarioAsignadoId: vehiculo.usuarioAsignadoId ?? "",
    proximaVerificacionFecha: vehiculo.proximaVerificacionFecha ?? "",
  };
}

export default function DetalleVehiculoPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { usuarioActivo } = useSessionStore();

  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [detalle, setDetalle] = useState<DetalleVehiculo | null>(null);
  const [mensajeError, setMensajeError] = useState("");
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([]);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState<DatosVehiculoBorrador | null>(null);
  const [enviandoEdicion, setEnviandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const [data, todosLosUsuarios] = await Promise.all([obtenerDetalleVehiculo(id), db.usuarios.toArray()]);
      if (!data) {
        setMensajeError("No se encontró el vehículo solicitado.");
        setEstado("error");
        return;
      }
      setDetalle(data);
      setUsuarios(todosLosUsuarios.map((u) => ({ id: u.id, nombre: u.nombreCompleto })));
      setEstado("listo");
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar el vehículo.");
      setEstado("error");
    }
  }, [id]);

  useEffect(() => {
    initializeDemoData().then(cargar);
  }, [cargar]);

  function activarEdicion() {
    if (!detalle) return;
    setDatosEdicion(detalleADatosBorrador(detalle));
    setErrorEdicion(null);
    setModoEdicion(true);
  }

  async function guardarEdicion(validados: DatosVehiculoValidados) {
    if (!usuarioActivo) return;
    setEnviandoEdicion(true);
    setErrorEdicion(null);
    try {
      const resultado = await actualizarVehiculo(
        id,
        {
          placa: validados.placa,
          marca: validados.marca,
          modelo: validados.modelo,
          anio: validados.anio,
          tipoVehiculo: validados.tipoVehiculo,
          modalidad: validados.modalidad,
          territorioId: validados.territorio,
          ubicacion: validados.ubicacion,
          capacidadPasajeros: validados.capacidadPasajeros,
          combustibleTipo: validados.combustibleTipo,
          kilometrajeActual: validados.kilometrajeActual,
          rendimientoKmPorLitro: validados.rendimientoKmPorLitro,
          costoPorKm: validados.costoPorKm,
          usuarioAsignadoId: validados.usuarioAsignadoId || undefined,
          proximaVerificacionFecha: validados.proximaVerificacionFecha || undefined,
        },
        usuarioActivo.id
      );
      if (esResultadoSinDatos(resultado)) {
        setErrorEdicion(resultado.detalle);
        toast.error("No se pudo guardar", resultado.detalle);
        return;
      }
      toast.success("Cambios guardados");
      setModoEdicion(false);
      await cargar();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "Ocurrió un error inesperado al guardar los cambios.";
      setErrorEdicion(mensaje);
      toast.error("No se pudo guardar", mensaje);
    } finally {
      setEnviandoEdicion(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Link href="/vehiculos" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>

        {estado === "cargando" && <LoadingState message="Cargando ficha del vehículo..." />}
        {estado === "error" && <ErrorState description={mensajeError} />}

        {estado === "listo" && detalle && usuarioActivo && (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{detalle.vehiculo.placa}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                    {detalle.vehiculo.marca} {detalle.vehiculo.modelo} ({detalle.vehiculo.anio})
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {detalle.territorioNombre} · {detalle.vehiculo.ubicacion}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`border-transparent font-medium ${ESTILOS_ESTADO[detalle.vehiculo.estadoOperativo]}`}>
                    {ETIQUETAS_ESTADO[detalle.vehiculo.estadoOperativo]}
                  </Badge>
                  <Badge variant="secondary">{MEDIO_LABELS[detalle.vehiculo.modalidad]}</Badge>
                </div>
              </div>

              {detalle.usuarioAsignadoNombre && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
                  <User className="h-3.5 w-3.5" /> Asignado a {detalle.usuarioAsignadoNombre}
                </p>
              )}

              {detalle.motivoBloqueoActual && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Bloqueado. Motivo: {detalle.motivoBloqueoActual}</p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="outline" onClick={activarEdicion}>
                  <Pencil className="h-3.5 w-3.5" /> Editar datos
                </Button>
                <DialogoBloqueo
                  vehiculoId={id}
                  placa={detalle.vehiculo.placa}
                  bloqueado={detalle.vehiculo.estadoOperativo === "FUERA_DE_SERVICIO"}
                  usuarioId={usuarioActivo.id}
                  onConfirmado={cargar}
                />
                <DialogoTerritorio
                  vehiculoId={id}
                  placa={detalle.vehiculo.placa}
                  territorioActualId={detalle.vehiculo.territorioId}
                  usuarioId={usuarioActivo.id}
                  onConfirmado={cargar}
                />
                {esModalidadFlota(detalle.vehiculo.modalidad) && (
                  <DialogoModalidad
                    vehiculoId={id}
                    placa={detalle.vehiculo.placa}
                    modalidadActual={detalle.vehiculo.modalidad}
                    usuarioId={usuarioActivo.id}
                    onConfirmado={cargar}
                  />
                )}
                <DialogoMantenimiento vehiculoId={id} placa={detalle.vehiculo.placa} usuarioId={usuarioActivo.id} onConfirmado={cargar} />
              </div>
            </section>

            {modoEdicion && datosEdicion && (
              <section className="rounded-3xl border border-slate-900/10 bg-slate-50 p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Editar datos del vehículo</h3>
                  <Button variant="ghost" size="sm" onClick={() => setModoEdicion(false)}>
                    Cancelar edición
                  </Button>
                </div>
                <FormularioVehiculo
                  datos={datosEdicion}
                  onDatosChange={(patch) => setDatosEdicion((d) => (d ? { ...d, ...patch } : d))}
                  modoEdicion
                  usuariosParaAsignar={usuarios}
                  onSubmit={guardarEdicion}
                  enviando={enviandoEdicion}
                  errorEnvio={errorEdicion}
                  textoBoton="Guardar cambios"
                />
              </section>
            )}

            <Tabs defaultValue="ficha" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <TabsList variant="line">
                <TabsTrigger value="ficha">Ficha técnica</TabsTrigger>
                <TabsTrigger value="reservaciones">Reservaciones ({detalle.reservacionesPasadas.length})</TabsTrigger>
                <TabsTrigger value="mantenimientos">Mantenimientos ({detalle.mantenimientos.length})</TabsTrigger>
                <TabsTrigger value="incidencias">Incidencias ({detalle.incidencias.length})</TabsTrigger>
                <TabsTrigger value="historial">Historial ({detalle.cambios.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="ficha" className="mt-4 space-y-6">
                <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs text-slate-500">Tipo</dt>
                    <dd className="font-medium text-slate-900">{detalle.vehiculo.tipoVehiculo}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Combustible</dt>
                    <dd className="font-medium text-slate-900">{detalle.vehiculo.combustibleTipo}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Capacidad</dt>
                    <dd className="font-medium text-slate-900">{detalle.vehiculo.capacidadPasajeros} pasajeros</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Kilometraje actual</dt>
                    <dd className="font-medium text-slate-900">{detalle.vehiculo.kilometrajeActual.toLocaleString("es-MX")} km</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Rendimiento</dt>
                    <dd className="font-medium text-slate-900">{detalle.vehiculo.rendimientoKmPorLitro} km/L</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Costo por km</dt>
                    <dd className="font-medium text-slate-900">${detalle.vehiculo.costoPorKm} MXN</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Próxima verificación / seguro</dt>
                    <dd className="font-medium text-slate-900">{detalle.vehiculo.proximaVerificacionFecha ?? "Sin registrar"}</dd>
                  </div>
                </dl>

                <div>
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-slate-500" />
                    <h4 className="text-sm font-semibold text-slate-900">Tendencia de utilización reciente</h4>
                  </div>
                  <div className="mt-4">
                    <TendenciaUtilizacion puntos={detalle.tendenciaUtilizacion} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reservaciones" className="mt-4">
                {detalle.reservacionesPasadas.length === 0 ? (
                  <p className="text-sm text-slate-500">Este vehículo todavía no tiene reservaciones registradas.</p>
                ) : (
                  <ul className="space-y-2">
                    {detalle.reservacionesPasadas.map(({ reservacion, folio, solicitanteNombre }) => (
                      <li key={reservacion.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">{folio}</p>
                          <Badge variant="outline">{reservacion.estadoReservacion}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {solicitanteNombre} · {formatearFecha(reservacion.fechaInicio)} → {formatearFecha(reservacion.fechaFin)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="mantenimientos" className="mt-4">
                {detalle.mantenimientos.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin mantenimientos registrados.</p>
                ) : (
                  <ul className="space-y-2">
                    {detalle.mantenimientos.map((m) => (
                      <li key={m.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="flex items-center gap-1.5 font-medium text-slate-900">
                            <Wrench className="h-3.5 w-3.5 text-slate-500" /> {m.tipoMantenimiento.replace(/_/g, " ")}
                          </p>
                          <Badge variant={m.fechaRealizada ? "secondary" : "outline"}>{m.fechaRealizada ? "Realizado" : "Programado"}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Programado: {m.fechaProgramada} {m.fechaRealizada ? `· Realizado: ${m.fechaRealizada}` : ""} · {m.responsable}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="incidencias" className="mt-4">
                {detalle.incidencias.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin incidencias registradas.</p>
                ) : (
                  <ul className="space-y-2">
                    {detalle.incidencias.map((inc) => (
                      <li key={inc.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">{inc.tipoIncidencia.replace(/_/g, " ")}</p>
                          <div className="flex gap-1.5">
                            <Badge variant={inc.severidad === "CRITICA" || inc.severidad === "ALTA" ? "destructive" : "secondary"}>
                              {inc.severidad}
                            </Badge>
                            <Badge variant="outline">{inc.estadoIncidencia}</Badge>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{inc.descripcion}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatearFecha(inc.fechaCreacion)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="historial" className="mt-4">
                {detalle.cambios.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin cambios registrados en auditoría todavía.</p>
                ) : (
                  <ul className="space-y-2">
                    {detalle.cambios.map((c, idx) => (
                      <li key={`${c.accion}-${idx}`} className="rounded-2xl border border-slate-200 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">{ETIQUETAS_ACCION[c.accion] ?? c.accion}</p>
                          <p className="text-xs text-slate-500">{formatearFecha(c.fecha)}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{c.detalle}</p>
                        <p className="mt-1 text-xs text-slate-400">Por: {c.usuarioNombre}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppShell>
  );
}
