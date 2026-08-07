import { describe, expect, it } from "vitest";
import { CHECKOUT_CONFIG } from "@/lib/config/checkout";
import {
  calcularDiferenciaCombustiblePorcentaje,
  calcularDuracionRealMinutos,
  calcularKilometrosRecorridos,
  calcularRetrasoMinutos,
  estabaAutorizadoFueraDeHorario,
  estaFueraDeHorarioLaboral,
  esUsoFueraDeHorario,
  validarDatosCheckOut,
  type DatosCheckOut,
} from "./servicio-checkout";

function datosValidos(overrides: Partial<DatosCheckOut> = {}): DatosCheckOut {
  return {
    kilometrajeFinal: 10600,
    kilometrajeInicial: 10500,
    combustibleRestante: 60,
    fotos: ["data:image/png;base64,foto1"],
    estadoVehiculo: "BUENO",
    llavesDevueltas: true,
    ...overrides,
  };
}

describe("validarDatosCheckOut", () => {
  it("acepta datos completos y válidos", () => {
    expect(validarDatosCheckOut(datosValidos())).toEqual({ valido: true, errores: [] });
  });

  it("rechaza un kilometraje final menor al inicial", () => {
    const resultado = validarDatosCheckOut(datosValidos({ kilometrajeFinal: 10000, kilometrajeInicial: 10500 }));
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes("no puede ser menor al inicial"))).toBe(true);
  });

  it("acepta kilometraje final igual al inicial (viaje de 0 km)", () => {
    const resultado = validarDatosCheckOut(datosValidos({ kilometrajeFinal: 10500, kilometrajeInicial: 10500 }));
    expect(resultado.valido).toBe(true);
  });

  it("rechaza un combustible final fuera de rango", () => {
    const resultado = validarDatosCheckOut(datosValidos({ combustibleRestante: 120 }));
    expect(resultado.valido).toBe(false);
  });

  it("exige al menos una fotografía", () => {
    const resultado = validarDatosCheckOut(datosValidos({ fotos: [] }));
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes("fotografía"))).toBe(true);
  });

  it("exige la devolución de llaves", () => {
    const resultado = validarDatosCheckOut(datosValidos({ llavesDevueltas: false }));
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes("llaves"))).toBe(true);
  });

  it("exige describir los daños cuando el estado del vehículo es 'con daños'", () => {
    const resultado = validarDatosCheckOut(datosValidos({ estadoVehiculo: "CON_DANOS", danosDescripcion: "" }));
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes("daños"))).toBe(true);
  });

  it("acepta 'con daños' cuando sí se describe el daño", () => {
    const resultado = validarDatosCheckOut(
      datosValidos({ estadoVehiculo: "CON_DANOS", danosDescripcion: "Rayón en la puerta izquierda" })
    );
    expect(resultado.valido).toBe(true);
  });

  it("no exige descripción de daños para 'con observaciones'", () => {
    const resultado = validarDatosCheckOut(datosValidos({ estadoVehiculo: "CON_OBSERVACIONES" }));
    expect(resultado.valido).toBe(true);
  });
});

describe("calcularKilometrosRecorridos", () => {
  it("calcula la diferencia entre kilometraje final e inicial", () => {
    expect(calcularKilometrosRecorridos(18250, 18450)).toBe(200);
  });

  it("nunca retorna un valor negativo", () => {
    expect(calcularKilometrosRecorridos(18250, 18000)).toBe(0);
  });
});

describe("calcularDuracionRealMinutos", () => {
  it("calcula los minutos transcurridos entre check-in y check-out", () => {
    expect(calcularDuracionRealMinutos("2025-01-15T08:30:00-06:00", "2025-01-15T18:00:00-06:00")).toBe(570);
  });
});

describe("calcularRetrasoMinutos", () => {
  it("retorna 0 si se devolvió a tiempo", () => {
    expect(calcularRetrasoMinutos("2025-01-15T18:00:00-06:00", "2025-01-15T18:00:00-06:00")).toBe(0);
  });

  it("retorna 0 si se devolvió antes de lo planeado", () => {
    expect(calcularRetrasoMinutos("2025-01-15T18:00:00-06:00", "2025-01-15T17:30:00-06:00")).toBe(0);
  });

  it("calcula los minutos de retraso frente al regreso planeado", () => {
    expect(calcularRetrasoMinutos("2025-01-15T18:00:00-06:00", "2025-01-15T18:45:00-06:00")).toBe(45);
  });
});

describe("calcularDiferenciaCombustiblePorcentaje", () => {
  it("retorna 0 cuando el consumo real coincide con el esperado", () => {
    const kilometros = 100;
    const esperado = CHECKOUT_CONFIG.consumoEsperadoPorcentajePor100Km;
    expect(calcularDiferenciaCombustiblePorcentaje(80, 80 - esperado, kilometros)).toBe(0);
  });

  it("es positivo cuando se consumió más combustible del esperado", () => {
    expect(calcularDiferenciaCombustiblePorcentaje(90, 40, 100)).toBeGreaterThan(0);
  });

  it("es negativo cuando se consumió menos combustible del esperado (o se recargó)", () => {
    expect(calcularDiferenciaCombustiblePorcentaje(50, 55, 20)).toBeLessThan(0);
  });
});

describe("estaFueraDeHorarioLaboral", () => {
  it("es fuera de horario en fin de semana aunque la hora esté dentro del rango laboral", () => {
    // 2026-08-08 es sábado
    expect(estaFueraDeHorarioLaboral(new Date("2026-08-08T10:00:00"))).toBe(true);
  });

  it("es fuera de horario antes de la hora de inicio laboral", () => {
    // 2026-08-10 es lunes
    expect(estaFueraDeHorarioLaboral(new Date("2026-08-10T06:00:00"))).toBe(true);
  });

  it("es fuera de horario después de la hora de fin laboral", () => {
    expect(estaFueraDeHorarioLaboral(new Date("2026-08-10T20:00:00"))).toBe(true);
  });

  it("no es fuera de horario en día y hora laboral", () => {
    expect(estaFueraDeHorarioLaboral(new Date("2026-08-10T10:00:00"))).toBe(false);
  });
});

describe("esUsoFueraDeHorario", () => {
  it("es true si el check-in ocurrió fuera de horario aunque el check-out no", () => {
    expect(esUsoFueraDeHorario("2026-08-08T10:00:00", "2026-08-10T10:00:00")).toBe(true);
  });

  it("es false si ambos ocurrieron dentro del horario laboral", () => {
    expect(esUsoFueraDeHorario("2026-08-10T09:00:00", "2026-08-10T12:00:00")).toBe(false);
  });
});

describe("estabaAutorizadoFueraDeHorario", () => {
  it("es false cuando no hay motivo de aprobación especial", () => {
    expect(estabaAutorizadoFueraDeHorario(undefined)).toBe(false);
  });

  it("es true cuando el motivo menciona fin de semana", () => {
    expect(estabaAutorizadoFueraDeHorario("se realiza en fin de semana")).toBe(true);
  });

  it("es true cuando el motivo menciona horario laboral", () => {
    expect(estabaAutorizadoFueraDeHorario("se realiza fuera del horario laboral")).toBe(true);
  });

  it("es false cuando el motivo es por costo, no por horario", () => {
    expect(estabaAutorizadoFueraDeHorario('su costo estimado ($600 MXN) supera el límite de $500 MXN')).toBe(false);
  });
});
