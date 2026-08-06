export interface TarifaConfig {
  nombre: string;
  modalidad: "POOL" | "ASIGNADO" | "UBER";
  costoBase: number;
  costoPorKm: number;
  costoPorHora: number;
}

export const tarifas: TarifaConfig[] = [
  {
    nombre: "Pool corporativo",
    modalidad: "POOL",
    costoBase: 120,
    costoPorKm: 2.8,
    costoPorHora: 35,
  },
  {
    nombre: "Asignado autorizado",
    modalidad: "ASIGNADO",
    costoBase: 180,
    costoPorKm: 3.6,
    costoPorHora: 45,
  },
  {
    nombre: "Uber for Business",
    modalidad: "UBER",
    costoBase: 95,
    costoPorKm: 4.2,
    costoPorHora: 55,
  },
];
