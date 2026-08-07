"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Clock3, LogIn, LogOut, PhoneCall, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import { enviarRecordatorio, type FilaOperativa } from "@/lib/adapters/operacion";
import { DialogoReasignacion } from "./dialogo-reasignacion";

interface PendientesDelDiaProps {
  entregas: FilaOperativa[];
  devoluciones: FilaOperativa[];
  usuarioActivoId: string;
  procesandoId: string | null;
  onMarcarCoordinada: (reservacionId: string, tipo: "ENTREGA" | "DEVOLUCION") => void;
  onReasignado: () => Promise<void> | void;
}

export function PendientesDelDia({
  entregas,
  devoluciones,
  usuarioActivoId,
  procesandoId,
  onMarcarCoordinada,
  onReasignado,
}: PendientesDelDiaProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <ListaPendientes
        titulo="Entregas pendientes hoy"
        icono={<LogIn className="h-4 w-4 text-slate-500" />}
        filas={entregas}
        vacio="No hay entregas pendientes para hoy."
        coordinadaDe={(f) => f.entregaCoordinada}
        tipo="ENTREGA"
        usuarioActivoId={usuarioActivoId}
        procesandoId={procesandoId}
        onMarcarCoordinada={onMarcarCoordinada}
        onReasignado={onReasignado}
      />
      <ListaPendientes
        titulo="Devoluciones pendientes"
        icono={<LogOut className="h-4 w-4 text-slate-500" />}
        filas={devoluciones}
        vacio="No hay devoluciones pendientes."
        coordinadaDe={(f) => f.devolucionCoordinada}
        tipo="DEVOLUCION"
        usuarioActivoId={usuarioActivoId}
        procesandoId={procesandoId}
        onMarcarCoordinada={onMarcarCoordinada}
        onReasignado={onReasignado}
      />
    </section>
  );
}

function BotonRecordatorio({ fila, tipo }: { fila: FilaOperativa; tipo: "ENTREGA" | "DEVOLUCION" }) {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={enviando || enviado}
      onClick={async () => {
        setEnviando(true);
        await enviarRecordatorio(fila, tipo);
        setEnviando(false);
        setEnviado(true);
      }}
    >
      <Bell className="h-3.5 w-3.5" /> {enviado ? "Recordatorio enviado" : enviando ? "Enviando..." : "Enviar recordatorio"}
    </Button>
  );
}

function ListaPendientes({
  titulo,
  icono,
  filas,
  vacio,
  coordinadaDe,
  tipo,
  usuarioActivoId,
  procesandoId,
  onMarcarCoordinada,
  onReasignado,
}: {
  titulo: string;
  icono: React.ReactNode;
  filas: FilaOperativa[];
  vacio: string;
  coordinadaDe: (f: FilaOperativa) => boolean;
  tipo: "ENTREGA" | "DEVOLUCION";
  usuarioActivoId: string;
  procesandoId: string | null;
  onMarcarCoordinada: (reservacionId: string, tipo: "ENTREGA" | "DEVOLUCION") => void;
  onReasignado: () => Promise<void> | void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        {icono} {titulo}
        <Badge variant="secondary">{filas.length}</Badge>
      </div>

      {filas.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{vacio}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {filas.map((f) => {
            const coordinada = coordinadaDe(f);
            const reservacionId = f.reservacion?.id;
            return (
              <li
                key={f.solicitud.id}
                className={`rounded-2xl border p-3 text-sm ${
                  f.esRetrasada ? "border-red-300 bg-red-50" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{f.solicitud.folio}</p>
                    <p className="text-xs text-slate-600">
                      {f.solicitanteNombre} · {f.territorioNombre} · {MEDIO_LABELS[f.solicitud.modalidadRequerida]}
                    </p>
                    {f.vehiculo && (
                      <p className="text-xs text-slate-500">
                        {f.vehiculo.marca} {f.vehiculo.modelo} ({f.vehiculo.placa})
                      </p>
                    )}
                  </div>
                  {f.esRetrasada && (
                    <Badge variant="destructive" className="gap-1">
                      <Clock3 className="h-3 w-3" /> {f.minutosRetraso} min de retraso
                    </Badge>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" render={<Link href={`/reservaciones/${f.solicitud.id}`} />} nativeButton={false}>
                    Ver detalle
                  </Button>

                  {reservacionId && f.reservacion && (
                    <DialogoReasignacion
                      solicitud={f.solicitud}
                      reservacion={f.reservacion}
                      vehiculoActual={f.vehiculo}
                      usuarioActivoId={usuarioActivoId}
                      onReasignado={onReasignado}
                      trigger={
                        <Button size="sm" variant="outline">
                          <Repeat className="h-3.5 w-3.5" /> Reasignar
                        </Button>
                      }
                    />
                  )}

                  {reservacionId && (
                    <Button
                      size="sm"
                      variant={coordinada ? "secondary" : "default"}
                      disabled={coordinada || procesandoId === reservacionId}
                      onClick={() => onMarcarCoordinada(reservacionId, tipo)}
                    >
                      {coordinada ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Coordinada
                        </>
                      ) : procesandoId === reservacionId ? (
                        "Guardando..."
                      ) : (
                        <>
                          <PhoneCall className="h-3.5 w-3.5" /> Marcar coordinada
                        </>
                      )}
                    </Button>
                  )}

                  {!coordinada && <BotonRecordatorio fila={f} tipo={tipo} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
