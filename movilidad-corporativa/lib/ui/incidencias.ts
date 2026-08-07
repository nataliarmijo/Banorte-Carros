/**
 * Etiquetas, colores y reglas de presentación para Incidencia (tipo,
 * severidad, estatus). Capa de UI (no de negocio): centraliza cómo se ven
 * las incidencias en /incidencias, /operacion y /vehiculos para que sean
 * consistentes en toda la app.
 */

import {
  AlertTriangle,
  Car,
  CircleDot,
  Clock,
  FileWarning,
  Fuel,
  MapPinOff,
  ShieldAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { EstadoIncidencia, NivelPrioridad, TipoIncidencia } from "@/lib/models";

export const TIPO_INCIDENCIA_LABELS: Record<TipoIncidencia, string> = {
  DANOS: "Daños",
  ACCIDENTE: "Accidente",
  RETRASO: "Retraso",
  DIFERENCIA_COMBUSTIBLE: "Diferencia de combustible",
  USO_FUERA_DE_HORARIO: "Uso fuera de horario",
  FIN_DE_SEMANA_NO_AUTORIZADO: "Fin de semana no autorizado",
  DESVIACION_RUTA: "Desviación de ruta",
  DOCUMENTACION_VENCIDA: "Documentación vencida",
  MANTENIMIENTO_VENCIDO: "Mantenimiento próximo o vencido",
};

export const TIPO_INCIDENCIA_ICONOS: Record<TipoIncidencia, LucideIcon> = {
  DANOS: Car,
  ACCIDENTE: ShieldAlert,
  RETRASO: Clock,
  DIFERENCIA_COMBUSTIBLE: Fuel,
  USO_FUERA_DE_HORARIO: Clock,
  FIN_DE_SEMANA_NO_AUTORIZADO: Clock,
  DESVIACION_RUTA: MapPinOff,
  DOCUMENTACION_VENCIDA: FileWarning,
  MANTENIMIENTO_VENCIDO: Wrench,
};

export const TIPOS_INCIDENCIA: TipoIncidencia[] = [
  "DANOS",
  "ACCIDENTE",
  "RETRASO",
  "DIFERENCIA_COMBUSTIBLE",
  "USO_FUERA_DE_HORARIO",
  "FIN_DE_SEMANA_NO_AUTORIZADO",
  "DESVIACION_RUTA",
  "DOCUMENTACION_VENCIDA",
  "MANTENIMIENTO_VENCIDO",
];

export const ESTADO_INCIDENCIA_LABELS: Record<EstadoIncidencia, string> = {
  ABIERTA: "Abierta",
  EN_PROCESO: "En proceso",
  RESUELTA: "Resuelta",
  CERRADA: "Cerrada",
};

export const ESTADO_INCIDENCIA_ESTILOS: Record<EstadoIncidencia, string> = {
  ABIERTA: "bg-red-100 text-red-700",
  EN_PROCESO: "bg-amber-100 text-amber-800",
  RESUELTA: "bg-emerald-100 text-emerald-800",
  CERRADA: "bg-slate-200 text-slate-600",
};

export const ESTADOS_INCIDENCIA: EstadoIncidencia[] = ["ABIERTA", "EN_PROCESO", "RESUELTA", "CERRADA"];

export const SEVERIDAD_LABELS: Record<NivelPrioridad, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

/** Clases Tailwind por severidad; Crítica siempre en rojo y destacada. */
export const SEVERIDAD_ESTILOS: Record<NivelPrioridad, string> = {
  BAJA: "bg-slate-100 text-slate-700",
  MEDIA: "bg-amber-100 text-amber-800",
  ALTA: "bg-orange-100 text-orange-800",
  CRITICA: "bg-red-100 text-red-700 ring-1 ring-red-300",
};

export const SEVERIDAD_ICONOS: Record<NivelPrioridad, LucideIcon> = {
  BAJA: CircleDot,
  MEDIA: CircleDot,
  ALTA: AlertTriangle,
  CRITICA: AlertTriangle,
};

export const NIVELES_PRIORIDAD: NivelPrioridad[] = ["BAJA", "MEDIA", "ALTA", "CRITICA"];

/** Una incidencia se considera "abierta" (pendiente de atención) mientras no esté Resuelta ni Cerrada. */
export function esIncidenciaAbierta(estado: EstadoIncidencia): boolean {
  return estado === "ABIERTA" || estado === "EN_PROCESO";
}
