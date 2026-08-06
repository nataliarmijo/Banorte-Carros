export interface FactorEmisionConfig {
  modalidad: "POOL" | "ASIGNADO" | "UBER";
  kgCo2PorKm: number;
  fuente: string;
}

export const factoresEmision: FactorEmisionConfig[] = [
  {
    modalidad: "POOL",
    kgCo2PorKm: 0.18,
    fuente: "Catálogo interno 2026",
  },
  {
    modalidad: "ASIGNADO",
    kgCo2PorKm: 0.24,
    fuente: "Catálogo interno 2026",
  },
  {
    modalidad: "UBER",
    kgCo2PorKm: 0.31,
    fuente: "Proveedor externo",
  },
];
