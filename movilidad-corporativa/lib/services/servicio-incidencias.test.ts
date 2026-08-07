import { describe, expect, it } from "vitest";
import { calcularIncidenciasPorCadaCienViajes } from "./servicio-incidencias";

describe("calcularIncidenciasPorCadaCienViajes", () => {
  it("calcula la tasa proporcionalmente (regla de tres simple)", () => {
    expect(calcularIncidenciasPorCadaCienViajes(5, 200)).toEqual({
      totalIncidencias: 5,
      totalViajes: 200,
      tasaPorCadaCienViajes: 2.5,
    });
  });

  it("da 100 cuando hay tantas incidencias como viajes", () => {
    expect(calcularIncidenciasPorCadaCienViajes(10, 10).tasaPorCadaCienViajes).toBe(100);
  });

  it("da 0 cuando no hay incidencias", () => {
    expect(calcularIncidenciasPorCadaCienViajes(0, 50).tasaPorCadaCienViajes).toBe(0);
  });

  it("retorna 0 (no divide entre cero) cuando no hay viajes registrados", () => {
    const resultado = calcularIncidenciasPorCadaCienViajes(3, 0);
    expect(resultado.tasaPorCadaCienViajes).toBe(0);
    expect(resultado.totalViajes).toBe(0);
  });

  it("redondea a un decimal", () => {
    expect(calcularIncidenciasPorCadaCienViajes(1, 3).tasaPorCadaCienViajes).toBe(33.3);
  });
});
