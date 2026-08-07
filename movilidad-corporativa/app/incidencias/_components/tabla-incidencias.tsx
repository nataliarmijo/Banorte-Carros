"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { IncidenciaListItem } from "@/lib/adapters/incidencias";
import {
  ESTADO_INCIDENCIA_ESTILOS,
  ESTADO_INCIDENCIA_LABELS,
  SEVERIDAD_ESTILOS,
  SEVERIDAD_LABELS,
  TIPO_INCIDENCIA_LABELS,
} from "@/lib/ui/incidencias";

function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export function TablaIncidencias({ items }: { items: IncidenciaListItem[] }) {
  if (items.length === 0) {
    return <p className="p-6 text-center text-sm text-slate-500">No hay incidencias que coincidan con los filtros.</p>;
  }

  return (
    <div className="max-h-[36rem] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Severidad</TableHead>
            <TableHead>Vehículo</TableHead>
            <TableHead>Territorio</TableHead>
            <TableHead>Folio origen</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead>Compromiso</TableHead>
            <TableHead>Estatus</TableHead>
            <TableHead>Reportada</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(({ incidencia, vehiculo, territorioNombre, folioSolicitud, responsableNombre }) => (
            <TableRow key={incidencia.id} className={incidencia.severidad === "CRITICA" ? "bg-red-50 hover:bg-red-100" : ""}>
              <TableCell className="font-medium">{TIPO_INCIDENCIA_LABELS[incidencia.tipoIncidencia]}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`border-transparent font-medium ${SEVERIDAD_ESTILOS[incidencia.severidad]}`}>
                  {SEVERIDAD_LABELS[incidencia.severidad]}
                </Badge>
              </TableCell>
              <TableCell>{vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})` : "—"}</TableCell>
              <TableCell>{territorioNombre}</TableCell>
              <TableCell>{folioSolicitud ?? "—"}</TableCell>
              <TableCell>{responsableNombre ?? "Sin asignar"}</TableCell>
              <TableCell>{incidencia.fechaCompromiso ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`border-transparent font-medium ${ESTADO_INCIDENCIA_ESTILOS[incidencia.estadoIncidencia]}`}>
                  {ESTADO_INCIDENCIA_LABELS[incidencia.estadoIncidencia]}
                </Badge>
              </TableCell>
              <TableCell>{formatearFecha(incidencia.fechaCreacion)}</TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" render={<Link href={`/incidencias/${incidencia.id}`} />} nativeButton={false}>
                  Ver
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
