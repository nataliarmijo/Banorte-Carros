import { describe, expect, it } from "vitest";
import { COSTOS_CONFIG } from "@/lib/config/costos";
import { calcularCostoUber, calcularCostoVehiculo } from "./servicio-costos";

describe("servicioCostos.calcularCostoVehiculo", () => {
  it("calcula el costo de combustible como km / rendimiento * precio por litro", () => {
    const km = 140;
    const resultado = calcularCostoVehiculo({
      km,
      tipoVehiculo: "sedan-compacto",
      modalidad: "pool",
    });

    const config = COSTOS_CONFIG.vehiculos["sedan-compacto"];
    const combustibleEsperado = (km / config.rendimientoKmLitro) * config.precioCombustibleLitro;

    expect(resultado.desglose.combustible).toBeCloseTo(combustibleEsperado, 5);
    expect(resultado.esEstimado).toBe(true);
  });

  it("el desglose de costos suma exactamente el costoTotal", () => {
    const resultado = calcularCostoVehiculo({
      km: 87,
      tipoVehiculo: "suv-asignado",
      modalidad: "asignado",
      duracionMinutos: 45,
    });

    const sumaDesglose = Object.values(resultado.desglose).reduce((acc, valor) => acc + valor, 0);
    expect(sumaDesglose).toBeCloseTo(resultado.costoTotal, 5);
  });

  it("el costo por km crece de forma consistente con la distancia (sin costos negativos)", () => {
    const params = { tipoVehiculo: "sedan-ejecutivo" as const, modalidad: "asignado" as const };
    const corto = calcularCostoVehiculo({ km: 50, ...params });
    const largo = calcularCostoVehiculo({ km: 100, ...params });

    expect(largo.costoTotal).toBeGreaterThan(corto.costoTotal);
  });

  it("retorna 'Sin datos suficientes' en vez de fallar cuando el tipo de vehículo es desconocido", () => {
    const resultado = calcularCostoVehiculo({
      km: 50,
      // @ts-expect-error probamos un tipo de vehículo no configurado
      tipoVehiculo: "camioneta-fantasma",
      modalidad: "pool",
    });

    expect(resultado.costoTotal).toBe(0);
    expect(resultado.notas.join(" ")).toContain("Sin datos suficientes");
  });
});

describe("servicioCostos.calcularCostoUber", () => {
  it("calcula tarifa base + costo por km + costo por minuto + casetas, afectado por el factor de demanda", () => {
    const km = 20;
    const duracionMinutos = 30;
    const factorDemanda = 1.5;

    const resultado = calcularCostoUber({ km, duracionMinutos, factorDemanda });
    const { uber } = COSTOS_CONFIG;

    const esperado =
      uber.tarifaBase * factorDemanda +
      uber.costoKm * km * factorDemanda +
      uber.costoMinuto * duracionMinutos * factorDemanda +
      uber.supuestoCasetas;

    expect(resultado.costoTotal).toBeCloseTo(esperado, 5);
  });

  it("retorna 'Sin datos suficientes' cuando la distancia es inválida en vez de fallar", () => {
    const resultado = calcularCostoUber({ km: -10 });
    expect(resultado.costoTotal).toBe(0);
    expect(resultado.notas.join(" ")).toContain("Sin datos suficientes");
  });
});
