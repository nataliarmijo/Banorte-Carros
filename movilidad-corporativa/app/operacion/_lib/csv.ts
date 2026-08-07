import { ESTADO_LABELS, MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import type { FilaOperativa } from "@/lib/adapters/operacion";

function escaparCsv(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

/** Exportación CSV simple del lado del cliente: sin librerías externas. */
export function filasACsv(filas: FilaOperativa[]): string {
  const encabezados = [
    "Folio",
    "Solicitante",
    "Territorio",
    "Vehículo",
    "Modalidad",
    "Estado",
    "Salida planeada",
    "Regreso planeado",
    "Retraso (min)",
    "Entrega coordinada",
    "Devolución coordinada",
  ];

  const filasCsv = filas.map((f) =>
    [
      f.solicitud.folio,
      f.solicitanteNombre,
      f.territorioNombre,
      f.vehiculo ? `${f.vehiculo.marca} ${f.vehiculo.modelo} (${f.vehiculo.placa})` : "Sin asignar",
      MEDIO_LABELS[f.solicitud.modalidadRequerida],
      ESTADO_LABELS[f.solicitud.estadoSolicitud],
      `${f.solicitud.fechaSolicitud} ${f.solicitud.horaInicioDeseada}`,
      f.reservacion ? new Date(f.reservacion.fechaFin).toLocaleString("es-MX") : "",
      String(f.minutosRetraso),
      f.entregaCoordinada ? "Sí" : "No",
      f.devolucionCoordinada ? "Sí" : "No",
    ]
      .map(escaparCsv)
      .join(",")
  );

  return [encabezados.map(escaparCsv).join(","), ...filasCsv].join("\n");
}

/** Dispara la descarga del CSV en el navegador (sin backend). */
export function descargarCsv(nombreArchivo: string, contenido: string): void {
  const bom = "﻿";
  const blob = new Blob([bom + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
