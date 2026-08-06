import { PARAMS_CONFIG } from "@/lib/config/params";
import { COSTOS_CONFIG } from "@/lib/config/costos";
import type { TipoVehiculo } from "@/lib/services/types";

export function combinarFechaHora(fechaISO: string, horaHHmm: string): Date {
  return new Date(`${fechaISO}T${horaHHmm}:00`);
}

/**
 * Simula una distancia estimada a partir de origen/destino mientras no haya
 * un proveedor de mapas conectado. Es determinística (la misma pareja de
 * textos siempre sugiere la misma distancia) para que la UI sea predecible;
 * el usuario puede sobreescribirla libremente.
 */
export function estimarDistanciaSimulada(origen: string, destino: string): number {
  const texto = `${origen.trim().toLowerCase()}->${destino.trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  const kmMin = 3;
  const kmMax = 45;
  return kmMin + (hash % (kmMax - kmMin + 1));
}

/** Duración estimada de un viaje a una velocidad promedio urbana simulada. */
export function estimarDuracionMinutos(distanciaKm: number): number {
  const velocidadPromedioKmH = 35;
  return Math.max(10, Math.round((distanciaKm / velocidadPromedioKmH) * 60));
}

export const TERRITORIOS_OPCIONES = Object.entries(PARAMS_CONFIG.territorios).map(([id, info]) => ({
  id,
  nombre: info.nombre,
}));

export const TERRITORIOS_ITEMS: Record<string, string> = Object.fromEntries(
  TERRITORIOS_OPCIONES.map((t) => [t.id, t.nombre])
);

export const TIPO_VEHICULO_LABELS: Record<TipoVehiculo, string> = {
  "sedan-compacto": `Sedán compacto · Pool (hasta ${COSTOS_CONFIG.vehiculos["sedan-compacto"].capacidadPersonas} pax)`,
  "sedan-ejecutivo": `Sedán ejecutivo · Asignado (hasta ${COSTOS_CONFIG.vehiculos["sedan-ejecutivo"].capacidadPersonas} pax)`,
  "suv-asignado": `SUV · Asignado (hasta ${COSTOS_CONFIG.vehiculos["suv-asignado"].capacidadPersonas} pax)`,
};

export const ALTERNATIVA_LABELS: Record<"POOL" | "ASIGNADO" | "UBER", string> = {
  POOL: "Vehículo Pool",
  ASIGNADO: "Vehículo Asignado",
  UBER: "Uber",
};
