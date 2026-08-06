import { tarifas } from "@/lib/config/tarifas";
import type { ModalidadVehiculo } from "@/lib/models";

export function calcularCostoPorKm(modalidad: ModalidadVehiculo, kmRecorridos: number): number {
  const tarifa = tarifas.find((item) => item.modalidad === modalidad);
  if (!tarifa) {
    throw new Error(`No existe tarifa para ${modalidad}`);
  }

  return tarifa.costoBase + tarifa.costoPorKm * kmRecorridos;
}

export function calcularCostoTotal(
  modalidad: ModalidadVehiculo,
  kmRecorridos: number,
  horas: number,
): number {
  const tarifa = tarifas.find((item) => item.modalidad === modalidad);
  if (!tarifa) {
    throw new Error(`No existe tarifa para ${modalidad}`);
  }

  return tarifa.costoBase + tarifa.costoPorKm * kmRecorridos + tarifa.costoPorHora * horas;
}
