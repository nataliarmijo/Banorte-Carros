export interface MetaGerencialConfig {
  territorio: string;
  metaUtilizacion: number;
  metaPoolPct: number;
  metaAhorroMensualMx: number;
}

export const metasGerenciales: MetaGerencialConfig[] = [
  {
    territorio: "CDMX",
    metaUtilizacion: 78,
    metaPoolPct: 60,
    metaAhorroMensualMx: 320000,
  },
  {
    territorio: "Monterrey",
    metaUtilizacion: 72,
    metaPoolPct: 58,
    metaAhorroMensualMx: 280000,
  },
  {
    territorio: "Guadalajara",
    metaUtilizacion: 70,
    metaPoolPct: 55,
    metaAhorroMensualMx: 240000,
  },
];
