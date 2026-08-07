"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IncidenciaOperativa } from "@/lib/adapters/operacion";
import { InfoDialog } from "./info-dialog";

function estilosSeveridad(severidad: IncidenciaOperativa["incidencia"]["severidad"]): string {
  if (severidad === "CRITICA") return "border-red-300 bg-red-50";
  if (severidad === "ALTA") return "border-amber-300 bg-amber-50";
  return "border-slate-200 bg-white";
}

function variantBadgeSeveridad(severidad: IncidenciaOperativa["incidencia"]["severidad"]): "destructive" | "secondary" | "outline" {
  if (severidad === "CRITICA" || severidad === "ALTA") return "destructive";
  if (severidad === "MEDIA") return "secondary";
  return "outline";
}

export function PanelIncidencias({ incidencias }: { incidencias: IncidenciaOperativa[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <AlertTriangle className="h-4 w-4 text-slate-500" /> Incidencias abiertas
        <Badge variant="secondary">{incidencias.length}</Badge>
      </div>

      {incidencias.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No hay incidencias abiertas con los filtros actuales.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {incidencias.map((item) => (
            <li key={item.incidencia.id} className={`rounded-2xl border p-3 text-sm ${estilosSeveridad(item.incidencia.severidad)}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-slate-900">{item.incidencia.tipoIncidencia.replace(/_/g, " ")}</p>
                <Badge variant={variantBadgeSeveridad(item.incidencia.severidad)}>{item.incidencia.severidad}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {item.vehiculo ? `${item.vehiculo.marca} ${item.vehiculo.modelo} (${item.vehiculo.placa})` : "Vehículo desconocido"} · {item.territorioNombre}
              </p>
              {item.folioSolicitud && <p className="text-xs text-slate-500">Folio: {item.folioSolicitud}</p>}
              <div className="mt-2">
                <InfoDialog
                  titulo="Detalle de la incidencia"
                  trigger={
                    <Button size="sm" variant="outline">
                      Ver detalle
                    </Button>
                  }
                >
                  <p>
                    <strong>Tipo:</strong> {item.incidencia.tipoIncidencia.replace(/_/g, " ")}
                  </p>
                  <p>
                    <strong>Severidad:</strong> {item.incidencia.severidad}
                  </p>
                  <p>
                    <strong>Estado:</strong> {item.incidencia.estadoIncidencia}
                  </p>
                  <p>
                    <strong>Vehículo:</strong> {item.vehiculo ? `${item.vehiculo.marca} ${item.vehiculo.modelo} (${item.vehiculo.placa})` : "—"}
                  </p>
                  <p>
                    <strong>Territorio:</strong> {item.territorioNombre}
                  </p>
                  {item.folioSolicitud && (
                    <p>
                      <strong>Folio:</strong> {item.folioSolicitud}
                    </p>
                  )}
                  <p>
                    <strong>Descripción:</strong> {item.incidencia.descripcion}
                  </p>
                  <p className="text-xs text-slate-500">
                    Reportada: {new Date(item.incidencia.fechaCreacion).toLocaleString("es-MX")}
                  </p>
                </InfoDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
