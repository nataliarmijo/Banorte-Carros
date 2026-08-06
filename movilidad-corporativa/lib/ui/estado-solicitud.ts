/**
 * Etiquetas, colores e íconos de presentación para EstadoSolicitud y
 * ModalidadVehiculo. Es una capa de UI (no de negocio): centraliza cómo se
 * ven los estados en /reservaciones y su detalle para que sean consistentes
 * en toda la app.
 */

import {
  Ban,
  Bus,
  Car,
  CheckCircle2,
  Clock,
  FileEdit,
  LogIn,
  PlayCircle,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { EstadoSolicitud, ModalidadVehiculo } from "@/lib/models";

export const ESTADO_LABELS: Record<EstadoSolicitud, string> = {
  BORRADOR: "Borrador",
  PENDIENTE_APROBACION: "Pendiente de aprobación",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  ASIGNADA: "Vehículo asignado",
  LISTA_CHECK_IN: "Lista para check-in",
  EN_CURSO: "En curso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

/** Clases Tailwind (bg/text) por estado, consistentes con la paleta del tema (Chunk 1). */
export const ESTADO_ESTILOS: Record<EstadoSolicitud, string> = {
  BORRADOR: "bg-slate-100 text-slate-700",
  PENDIENTE_APROBACION: "bg-amber-100 text-amber-800",
  APROBADA: "bg-sky-100 text-sky-800",
  RECHAZADA: "bg-red-100 text-red-700",
  ASIGNADA: "bg-indigo-100 text-indigo-800",
  LISTA_CHECK_IN: "bg-violet-100 text-violet-800",
  EN_CURSO: "bg-blue-100 text-blue-800",
  COMPLETADA: "bg-emerald-100 text-emerald-800",
  CANCELADA: "bg-slate-200 text-slate-500",
};

export const ESTADO_ICONOS: Record<EstadoSolicitud, LucideIcon> = {
  BORRADOR: FileEdit,
  PENDIENTE_APROBACION: Clock,
  APROBADA: ShieldCheck,
  RECHAZADA: XCircle,
  ASIGNADA: Car,
  LISTA_CHECK_IN: LogIn,
  EN_CURSO: PlayCircle,
  COMPLETADA: CheckCircle2,
  CANCELADA: Ban,
};

export const ESTADOS_SOLICITUD: EstadoSolicitud[] = [
  "BORRADOR",
  "PENDIENTE_APROBACION",
  "APROBADA",
  "ASIGNADA",
  "LISTA_CHECK_IN",
  "EN_CURSO",
  "COMPLETADA",
  "RECHAZADA",
  "CANCELADA",
];

export const MEDIO_LABELS: Record<ModalidadVehiculo, string> = {
  POOL: "Pool",
  ASIGNADO: "Asignado",
  UBER: "Uber",
};

export const MEDIO_ICONOS: Record<ModalidadVehiculo, LucideIcon> = {
  POOL: Bus,
  ASIGNADO: Car,
  UBER: Car,
};
