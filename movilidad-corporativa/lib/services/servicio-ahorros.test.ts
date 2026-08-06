import { describe, expect, it } from "vitest";
import { COSTOS_CONFIG } from "@/lib/config/costos";
import { calcularAhorros } from "./servicio-ahorros";
import { calcularCostoVehiculo } from "./servicio-costos";

describe("servicioAhorros.calcularAhorros", () => {
  it("retorna 'Sin datos suficientes' cuando no hay viajes (evita dividir entre cero viajes)", () => {
    const resultado = calcularAhorros([]);
    expect(resultado).toMatchObject({ exito: false, error: "Sin datos suficientes" });
  });

  it("atribuye el ahorro a 'mayorUsoPool' cuando el viaje se resolvió con Pool", () => {
    const costoPool = calcularCostoVehiculo({
      km: 50,
      tipoVehiculo: "sedan-compacto",
      modalidad: "pool",
    });

    const resultado = calcularAhorros([
      {
        distanciaKm: 50,
        alternativaElegida: "POOL",
        costoAlternativaElegida: costoPool.costoTotal,
      },
    ]);

    if (!("ahorroTotal" in resultado)) {
      throw new Error("se esperaba un resultado válido, no 'Sin datos suficientes'");
    }
    expect(resultado.ahorrosPorConcepto.mayorUsoPool).toBeGreaterThan(0);
    expect(resultado.ahorrosPorConcepto.digitalizacion).toBeCloseTo(
      COSTOS_CONFIG.uber.costoAdministrativoManual,
      5
    );
    expect(resultado.ahorroTotal).toBeCloseTo(
      resultado.costoBaseEstimado - resultado.costoRealOptimizado,
      5
    );
  });

  it("excluye viajes con distancia inválida en vez de fallar", () => {
    const resultado = calcularAhorros([
      { distanciaKm: -5, alternativaElegida: "UBER", costoAlternativaElegida: 100 },
      { distanciaKm: 20, alternativaElegida: "UBER", costoAlternativaElegida: 100 },
    ]);

    if (!("ahorroTotal" in resultado)) {
      throw new Error("se esperaba un resultado válido, no 'Sin datos suficientes'");
    }
    expect(resultado.notas.join(" ")).toContain("excluido");
  });
});
