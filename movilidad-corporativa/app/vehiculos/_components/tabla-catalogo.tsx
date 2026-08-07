"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import type { VehiculoCatalogoItem } from "@/lib/adapters/vehiculos";

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

export function TablaCatalogo({ items }: { items: VehiculoCatalogoItem[] }) {
  if (items.length === 0) {
    return <p className="p-6 text-center text-sm text-slate-500">No hay vehículos que coincidan con los filtros.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Placa</TableHead>
            <TableHead>Marca / modelo / año</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Combustible</TableHead>
            <TableHead>Territorio</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Modalidad</TableHead>
            <TableHead>Usuario asignado</TableHead>
            <TableHead>Km actual</TableHead>
            <TableHead>Rendimiento</TableHead>
            <TableHead>Factor emisiones</TableHead>
            <TableHead>Estatus</TableHead>
            <TableHead>Próxima verificación</TableHead>
            <TableHead>Utilización reciente</TableHead>
            <TableHead>Incidencias abiertas</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(({ vehiculo, territorioNombre, usuarioAsignadoNombre, incidenciasAbiertas, viajesRecientes, factorEmisionValor }) => (
            <TableRow key={vehiculo.id} className={vehiculo.estadoOperativo === "FUERA_DE_SERVICIO" ? "bg-red-50/60" : ""}>
              <TableCell className="text-xs text-slate-400">{vehiculo.id.slice(0, 8)}</TableCell>
              <TableCell className="font-medium">{vehiculo.placa}</TableCell>
              <TableCell>
                {vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio})
              </TableCell>
              <TableCell>{vehiculo.tipoVehiculo}</TableCell>
              <TableCell>{vehiculo.combustibleTipo}</TableCell>
              <TableCell>{territorioNombre}</TableCell>
              <TableCell>{vehiculo.ubicacion}</TableCell>
              <TableCell>{MEDIO_LABELS[vehiculo.modalidad]}</TableCell>
              <TableCell>{usuarioAsignadoNombre ?? "—"}</TableCell>
              <TableCell>{vehiculo.kilometrajeActual.toLocaleString("es-MX")} km</TableCell>
              <TableCell>{vehiculo.rendimientoKmPorLitro > 0 ? `${vehiculo.rendimientoKmPorLitro} km/L` : "—"}</TableCell>
              <TableCell>{factorEmisionValor !== null ? `${factorEmisionValor} kgCO₂/km` : "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`border-transparent font-medium ${ESTILOS_ESTADO[vehiculo.estadoOperativo]}`}>
                  {ETIQUETAS_ESTADO[vehiculo.estadoOperativo]}
                </Badge>
              </TableCell>
              <TableCell>{vehiculo.proximaVerificacionFecha ?? "—"}</TableCell>
              <TableCell>{viajesRecientes} viaje(s)</TableCell>
              <TableCell>
                {incidenciasAbiertas > 0 ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> {incidenciasAbiertas}
                  </Badge>
                ) : (
                  "0"
                )}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" render={<Link href={`/vehiculos/${vehiculo.id}`} />} nativeButton={false}>
                  Ver detalle
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
