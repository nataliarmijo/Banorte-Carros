import { describe, expect, it } from "vitest";
import { calcularEmisionesUber, calcularEmisionesVehiculo } from "./servicio-emisiones";

describe("servicioEmisiones.calcularEmisionesVehiculo", () => {
  it("calcula emisiones proporcionales al consumo de combustible (km / rendimiento)", () => {
    const resultado = calcularEmisionesVehiculo({
      km: 100,
      tipoVehiculo: "sedan-compacto",
      rendimientoKmLitro: 14,
      tipoCombustible: "GASOLINA",
    });

    expect(resultado.totalGramosCo2).toBeGreaterThan(0);
    expect(resultado.totalKgCo2).toBeCloseTo(resultado.totalGramosCo2 / 1000, 6);
    expect(resultado.esEstimado).toBe(true);
  });

  it("evita la división entre cero: rendimiento 0 retorna 'Sin datos suficientes' en vez de Infinity/NaN", () => {
    const resultado = calcularEmisionesVehiculo({
      km: 100,
      tipoVehiculo: "sedan-compacto",
      rendimientoKmLitro: 0,
    });

    expect(resultado.totalGramosCo2).toBe(0);
    expect(Number.isFinite(resultado.totalGramosCo2)).toBe(true);
    expect(resultado.notas.join(" ")).toContain("Sin datos suficientes");
  });

  it("evita la división entre cero: distancia 0 retorna 'Sin datos suficientes'", () => {
    const resultado = calcularEmisionesVehiculo({
      km: 0,
      tipoVehiculo: "sedan-compacto",
      rendimientoKmLitro: 14,
    });

    expect(resultado.totalGramosCo2).toBe(0);
    expect(resultado.notas.join(" ")).toContain("Sin datos suficientes");
  });
});

describe("servicioEmisiones.calcularEmisionesUber", () => {
  it("calcula emisiones proporcionales a la distancia", () => {
    const corto = calcularEmisionesUber({ km: 10 });
    const largo = calcularEmisionesUber({ km: 20 });

    expect(largo.totalGramosCo2).toBeCloseTo(corto.totalGramosCo2 * 2, 5);
  });
});
