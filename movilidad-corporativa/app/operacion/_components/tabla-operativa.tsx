"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EstadoBadge } from "@/components/estado-badge";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import type { FilaOperativa } from "@/lib/adapters/operacion";
import { descargarCsv, filasACsv } from "../_lib/csv";
import { DialogoReasignacion } from "./dialogo-reasignacion";

type Columna = "folio" | "solicitante" | "territorio" | "vehiculo" | "modalidad" | "estado" | "salida" | "regreso" | "retraso";

interface TablaOperativaProps {
  filas: FilaOperativa[];
  usuarioActivoId: string;
  onReasignado: () => Promise<void> | void;
}

const EXTRACTORES: Record<Columna, (f: FilaOperativa) => string | number> = {
  folio: (f) => f.solicitud.folio,
  solicitante: (f) => f.solicitanteNombre,
  territorio: (f) => f.territorioNombre,
  vehiculo: (f) => (f.vehiculo ? `${f.vehiculo.marcaModelo} ${f.vehiculo.placa}` : ""),
  modalidad: (f) => f.solicitud.modalidadRequerida,
  estado: (f) => f.solicitud.estadoSolicitud,
  salida: (f) => `${f.solicitud.fechaSolicitud}T${f.solicitud.horaInicioDeseada}`,
  regreso: (f) => (f.reservacion ? f.reservacion.fechaFin : ""),
  retraso: (f) => f.minutosRetraso,
};

const ENCABEZADOS: { clave: Columna; etiqueta: string }[] = [
  { clave: "folio", etiqueta: "Folio" },
  { clave: "solicitante", etiqueta: "Solicitante" },
  { clave: "territorio", etiqueta: "Territorio" },
  { clave: "vehiculo", etiqueta: "Vehículo" },
  { clave: "modalidad", etiqueta: "Modalidad" },
  { clave: "estado", etiqueta: "Estado" },
  { clave: "salida", etiqueta: "Salida planeada" },
  { clave: "regreso", etiqueta: "Regreso planeado" },
  { clave: "retraso", etiqueta: "Retraso" },
];

export function TablaOperativa({ filas, usuarioActivoId, onReasignado }: TablaOperativaProps) {
  const [orden, setOrden] = useState<{ columna: Columna; direccion: "asc" | "desc" }>({ columna: "salida", direccion: "asc" });

  const filasOrdenadas = useMemo(() => {
    const extractor = EXTRACTORES[orden.columna];
    const copia = [...filas];
    copia.sort((a, b) => {
      const va = extractor(a);
      const vb = extractor(b);
      const comparacion = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return orden.direccion === "asc" ? comparacion : -comparacion;
    });
    return copia;
  }, [filas, orden]);

  function alternarOrden(columna: Columna) {
    setOrden((actual) =>
      actual.columna === columna ? { columna, direccion: actual.direccion === "asc" ? "desc" : "asc" } : { columna, direccion: "asc" }
    );
  }

  function exportarCsv() {
    const csv = filasACsv(filasOrdenadas);
    descargarCsv(`operacion-flota-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Tabla operativa</h3>
          <p className="text-xs text-slate-500">{filasOrdenadas.length} reservación(es)</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportarCsv} disabled={filasOrdenadas.length === 0}>
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </Button>
      </div>

      {filasOrdenadas.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">No hay reservaciones que coincidan con los filtros.</p>
      ) : (
        <div className="max-h-[32rem] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
              <TableRow>
                {ENCABEZADOS.map(({ clave, etiqueta }) => (
                  <TableHead key={clave}>
                    <button
                      type="button"
                      onClick={() => alternarOrden(clave)}
                      className="flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900"
                    >
                      {etiqueta}
                      {orden.columna === clave ? (
                        orden.direccion === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-300" />
                      )}
                    </button>
                  </TableHead>
                ))}
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filasOrdenadas.map((f) => (
                <TableRow key={f.solicitud.id} className={f.esRetrasada ? "bg-red-50 hover:bg-red-100" : ""}>
                  <TableCell className="font-medium">{f.solicitud.folio}</TableCell>
                  <TableCell>{f.solicitanteNombre}</TableCell>
                  <TableCell>{f.territorioNombre}</TableCell>
                  <TableCell>{f.vehiculo ? `${f.vehiculo.marcaModelo} (${f.vehiculo.placa})` : "Sin asignar"}</TableCell>
                  <TableCell>{MEDIO_LABELS[f.solicitud.modalidadRequerida]}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={f.solicitud.estadoSolicitud} />
                  </TableCell>
                  <TableCell>
                    {f.solicitud.fechaSolicitud} {f.solicitud.horaInicioDeseada}
                  </TableCell>
                  <TableCell>{f.reservacion ? new Date(f.reservacion.fechaFin).toLocaleString("es-MX") : "—"}</TableCell>
                  <TableCell className={f.esRetrasada ? "font-semibold text-red-700" : ""}>
                    {f.esRetrasada ? `${f.minutosRetraso} min` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" render={<Link href={`/reservaciones/${f.solicitud.id}`} />} nativeButton={false}>
                        Ver
                      </Button>
                      {f.reservacion && (
                        <DialogoReasignacion
                          solicitud={f.solicitud}
                          reservacion={f.reservacion}
                          vehiculoActual={f.vehiculo}
                          usuarioActivoId={usuarioActivoId}
                          onReasignado={onReasignado}
                          trigger={
                            <Button size="sm" variant="ghost">
                              <Repeat className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
