"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { initializeDemoData } from "@/lib/seed/init";
import { useSessionStore } from "@/lib/stores/session";
import {
  cancelarSolicitud,
  listarSolicitudesDeTerritorio,
  listarSolicitudesDeUsuario,
  type SolicitudListItem,
} from "@/lib/adapters/reservaciones";
import { esResultadoSinDatos } from "@/lib/services/types";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EstadoBadge } from "./_components/estado-badge";
import { AccionesSolicitud } from "./_components/acciones-solicitud";
import { FiltrosBar, type VistaLista } from "./_components/filtros-bar";
import { aplicarFiltros, FILTROS_INICIALES, type FiltrosReservaciones } from "./_lib/filtros";

export default function ReservacionesPage() {
  const { usuarioActivo, rolActivo } = useSessionStore();
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [items, setItems] = useState<SolicitudListItem[]>([]);
  const [mensajeError, setMensajeError] = useState("");
  const [filtros, setFiltros] = useState<FiltrosReservaciones>(FILTROS_INICIALES);
  const [vista, setVista] = useState<VistaLista>("tarjetas");
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!usuarioActivo) return;
    setEstado("cargando");
    try {
      const lista =
        rolActivo === "APROBADOR"
          ? await listarSolicitudesDeTerritorio(usuarioActivo.territorioId)
          : await listarSolicitudesDeUsuario(usuarioActivo.id);
      setItems(lista);
      setEstado("listo");
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar tus reservaciones.");
      setEstado("error");
    }
  }, [usuarioActivo, rolActivo]);

  useEffect(() => {
    initializeDemoData().then(cargar);
  }, [cargar]);

  const itemsFiltrados = useMemo(() => aplicarFiltros(items, filtros), [items, filtros]);
  const territoriosDisponibles = useMemo(
    () => Object.entries(PARAMS_CONFIG.territorios).map(([id, info]) => ({ id, nombre: info.nombre })),
    []
  );

  async function manejarCancelar(solicitudId: string) {
    if (!usuarioActivo) return;
    setErrorAccion(null);
    const resultado = await cancelarSolicitud(solicitudId, usuarioActivo.id);
    if (esResultadoSinDatos(resultado)) {
      setErrorAccion(resultado.detalle);
      return;
    }
    await cargar();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Mis reservaciones</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            {rolActivo === "APROBADOR" ? "Reservaciones de tu territorio" : "Tus viajes corporativos"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Consulta el estado de cada solicitud, su vehículo asignado y la trazabilidad del recorrido, incluyendo el
            comentario del aprobador cuando una solicitud fue rechazada.
          </p>
        </section>

        {errorAccion && <ErrorState title="No se pudo cancelar" description={errorAccion} />}

        {estado === "cargando" && <LoadingState message="Cargando tus reservaciones..." />}

        {estado === "error" && <ErrorState description={mensajeError} />}

        {estado === "listo" &&
          (items.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-12 w-12" />}
              title="No tienes reservaciones todavía"
              description="Cuando envíes una solicitud de viaje, aparecerá aquí con su estado y trazabilidad."
            />
          ) : (
            <>
              <FiltrosBar
                filtros={filtros}
                onFiltrosChange={(patch) => setFiltros((f) => ({ ...f, ...patch }))}
                territoriosDisponibles={territoriosDisponibles}
                vista={vista}
                onVistaChange={setVista}
              />

              {itemsFiltrados.length === 0 ? (
                <EmptyState title="Sin resultados con estos filtros" description="Ajusta los filtros para ver otras reservaciones." />
              ) : vista === "tarjetas" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {itemsFiltrados.map((item) => (
                    <div
                      key={item.solicitud.id}
                      className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.solicitud.folio}</p>
                          <EstadoBadge estado={item.solicitud.estadoSolicitud} />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {item.solicitud.origen} → {item.solicitud.destino}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.solicitud.fechaSolicitud} · {item.solicitud.horaInicioDeseada}
                        </p>
                        <p className="mt-2 text-xs text-slate-600">
                          {MEDIO_LABELS[item.solicitud.modalidadRequerida]}
                          {item.vehiculoNombre ? ` · ${item.vehiculoNombre}` : ""}
                        </p>
                      </div>
                      <div className="mt-4">
                        <AccionesSolicitud
                          item={item}
                          usuarioActivoId={usuarioActivo?.id ?? ""}
                          onCancelar={manejarCancelar}
                          compacto
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Folio</TableHead>
                        <TableHead>Ruta</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Medio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsFiltrados.map((item) => (
                        <TableRow key={item.solicitud.id}>
                          <TableCell className="font-medium">{item.solicitud.folio}</TableCell>
                          <TableCell>
                            {item.solicitud.origen} → {item.solicitud.destino}
                          </TableCell>
                          <TableCell>
                            {item.solicitud.fechaSolicitud} {item.solicitud.horaInicioDeseada}
                          </TableCell>
                          <TableCell>{MEDIO_LABELS[item.solicitud.modalidadRequerida]}</TableCell>
                          <TableCell>
                            <EstadoBadge estado={item.solicitud.estadoSolicitud} />
                          </TableCell>
                          <TableCell>
                            <AccionesSolicitud
                              item={item}
                              usuarioActivoId={usuarioActivo?.id ?? ""}
                              onCancelar={manejarCancelar}
                              compacto
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ))}
      </div>
    </AppShell>
  );
}
