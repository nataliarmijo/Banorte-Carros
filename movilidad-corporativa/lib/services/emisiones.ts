import { factoresEmision } from "@/lib/config/emisiones";
import type { ModalidadVehiculo } from "@/lib/models";

export function calcularEmisiones(modalidad: ModalidadVehiculo, kmRecorridos: number): number {
  const factor = factoresEmision.find((item) => item.modalidad === modalidad);
  if (!factor) {
    throw new Error(`No existe factor de emisión para ${modalidad}`);
  }

  return factor.kgCo2PorKm * kmRecorridos;
}

export function calcularCo2Evitado(
  emisionesBase: number,
  emisionesReales: number,
): number {
  return Math.max(emisionesBase - emisionesReales, 0);
}
