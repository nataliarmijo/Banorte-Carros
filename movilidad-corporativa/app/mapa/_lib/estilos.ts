import type { EstadoMapaVehiculo } from "@/lib/adapters/mapa";

/** Color hexadecimal (para el SVG) y clases Tailwind (para tarjetas/insignias) por estado del mapa. */
export const COLOR_HEX_ESTADO: Record<EstadoMapaVehiculo, string> = {
  DISPONIBLE: "#10b981", // emerald-500
  EN_USO: "#3b82f6", // blue-500
  FUERA_DE_HORARIO: "#f59e0b", // amber-500
  EN_MANTENIMIENTO: "#8b5cf6", // violet-500
  BLOQUEADO: "#ef4444", // red-500
};

export const ETIQUETA_ESTADO: Record<EstadoMapaVehiculo, string> = {
  DISPONIBLE: "Disponible",
  EN_USO: "En uso",
  FUERA_DE_HORARIO: "En uso · fuera de horario",
  EN_MANTENIMIENTO: "En mantenimiento",
  BLOQUEADO: "Bloqueado",
};

export const ESTILO_BADGE_ESTADO: Record<EstadoMapaVehiculo, string> = {
  DISPONIBLE: "bg-emerald-100 text-emerald-800",
  EN_USO: "bg-blue-100 text-blue-800",
  FUERA_DE_HORARIO: "bg-amber-100 text-amber-800",
  EN_MANTENIMIENTO: "bg-violet-100 text-violet-800",
  BLOQUEADO: "bg-red-100 text-red-700",
};

export const COLOR_ORIGEN_SOLICITUD = "#0f172a"; // slate-900
