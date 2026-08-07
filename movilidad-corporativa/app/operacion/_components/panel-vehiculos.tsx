"use client";

import { Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import type { VehiculoOperativo } from "@/lib/adapters/operacion";
import { InfoDialog } from "./info-dialog";

const ESTILOS_ESTADO_OPERATIVO: Record<VehiculoOperativo["vehiculo"]["estadoOperativo"], string> = {
  DISPONIBLE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  OCUPADO: "border-blue-200 bg-blue-50 text-blue-800",
  EN_MANTENIMIENTO: "border-amber-200 bg-amber-50 text-amber-800",
  FUERA_DE_SERVICIO: "border-red-200 bg-red-50 text-red-800",
};

const ETIQUETAS_ESTADO_OPERATIVO: Record<VehiculoOperativo["vehiculo"]["estadoOperativo"], string> = {
  DISPONIBLE: "Disponible",
  OCUPADO: "En uso",
  EN_MANTENIMIENTO: "En mantenimiento",
  FUERA_DE_SERVICIO: "Fuera de servicio",
};

export function PanelVehiculos({ vehiculos }: { vehiculos: VehiculoOperativo[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Car className="h-4 w-4 text-slate-500" /> Flota (Pool / Asignado)
        <Badge variant="secondary">{vehiculos.length}</Badge>
      </div>

      {vehiculos.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No hay vehículos que coincidan con los filtros actuales.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {vehiculos.map((item) => (
            <li
              key={item.vehiculo.id}
              className={`rounded-2xl border p-3 text-sm ${ESTILOS_ESTADO_OPERATIVO[item.vehiculo.estadoOperativo]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  {item.vehiculo.marcaModelo} ({item.vehiculo.placa})
                </p>
                <Badge variant="outline" className="shrink-0 border-transparent bg-white/70">
                  {ETIQUETAS_ESTADO_OPERATIVO[item.vehiculo.estadoOperativo]}
                </Badge>
              </div>
              <p className="mt-1 text-xs opacity-80">
                {item.territorioNombre} · {MEDIO_LABELS[item.vehiculo.modalidad]}
              </p>
              <div className="mt-2">
                <InfoDialog
                  titulo={`${item.vehiculo.marcaModelo} (${item.vehiculo.placa})`}
                  trigger={
                    <Button size="sm" variant="outline" className="bg-white/70">
                      Ver detalle
                    </Button>
                  }
                >
                  <p>
                    <strong>Territorio:</strong> {item.territorioNombre}
                  </p>
                  <p>
                    <strong>Modalidad:</strong> {MEDIO_LABELS[item.vehiculo.modalidad]}
                  </p>
                  <p>
                    <strong>Tipo:</strong> {item.vehiculo.tipoVehiculo}
                  </p>
                  <p>
                    <strong>Estado operativo:</strong> {ETIQUETAS_ESTADO_OPERATIVO[item.vehiculo.estadoOperativo]}
                  </p>
                  <p>
                    <strong>Kilometraje actual:</strong> {item.vehiculo.kilometrajeActual.toLocaleString("es-MX")} km
                  </p>
                  <p>
                    <strong>Combustible:</strong> {item.vehiculo.combustibleTipo}
                  </p>
                  <p>
                    <strong>Último mantenimiento:</strong>{" "}
                    {item.ultimoMantenimiento
                      ? `${item.ultimoMantenimiento.tipoMantenimiento} · ${item.ultimoMantenimiento.fechaRealizada}`
                      : "Sin mantenimientos registrados"}
                  </p>
                  {item.folioReservacionActiva && (
                    <p>
                      <strong>Reservación activa:</strong> {item.folioReservacionActiva}
                    </p>
                  )}
                </InfoDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
