import { describe, expect, it } from "vitest";
import { CHECKIN_CONFIG } from "@/lib/config/checkin";
import { esFechaSalidaVigente, validarDatosCheckIn, type DatosCheckIn } from "./servicio-checkin";

function datosValidos(overrides: Partial<DatosCheckIn> = {}): DatosCheckIn {
  return {
    kilometrajeInicial: 10500,
    kilometrajeActualVehiculo: 10500,
    combustibleInicial: 80,
    fotos: ["data:image/png;base64,foto1"],
    firmaElectronica: "data:image/png;base64,firma",
    responsivaAceptada: true,
    ...overrides,
  };
}

describe("esFechaSalidaVigente", () => {
  const ahora = new Date("2026-08-10T09:00:00-06:00");

  it("es vigente exactamente en la fecha de salida", () => {
    expect(esFechaSalidaVigente("2026-08-10T09:00:00-06:00", ahora)).toBe(true);
  });

  it("es vigente dentro de la ventana previa configurada", () => {
    const fechaSalida = new Date(ahora.getTime() + (CHECKIN_CONFIG.ventanaPreviaHoras - 1) * 60 * 60 * 1000).toISOString();
    expect(esFechaSalidaVigente(fechaSalida, ahora)).toBe(true);
  });

  it("no es vigente fuera de la ventana previa configurada", () => {
    const fechaSalida = new Date(ahora.getTime() + (CHECKIN_CONFIG.ventanaPreviaHoras + 1) * 60 * 60 * 1000).toISOString();
    expect(esFechaSalidaVigente(fechaSalida, ahora)).toBe(false);
  });

  it("sigue vigente después de la fecha de salida (llegar tarde no bloquea)", () => {
    const fechaSalida = new Date(ahora.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(esFechaSalidaVigente(fechaSalida, ahora)).toBe(true);
  });

  it("retorna false para una fecha inválida", () => {
    expect(esFechaSalidaVigente("no-es-una-fecha", ahora)).toBe(false);
  });
});

describe("validarDatosCheckIn", () => {
  it("acepta datos completos y válidos", () => {
    const resultado = validarDatosCheckIn(datosValidos());
    expect(resultado).toEqual({ valido: true, errores: [] });
  });

  it("rechaza un kilometraje inicial menor al último registrado del vehículo", () => {
    const resultado = validarDatosCheckIn(datosValidos({ kilometrajeInicial: 9000, kilometrajeActualVehiculo: 10500 }));
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes("no puede ser menor"))).toBe(true);
  });

  it("rechaza un kilometraje inicial excesivamente mayor al último registrado", () => {
    const resultado = validarDatosCheckIn(
      datosValidos({
        kilometrajeInicial: 10500 + CHECKIN_CONFIG.kilometrajeExcedenteRazonableKm + 1,
        kilometrajeActualVehiculo: 10500,
      })
    );
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes("demasiado alto"))).toBe(true);
  });

  it("acepta un kilometraje dentro del margen razonable configurado", () => {
    const resultado = validarDatosCheckIn(
      datosValidos({
        kilometrajeInicial: 10500 + CHECKIN_CONFIG.kilometrajeExcedenteRazonableKm,
        kilometrajeActualVehiculo: 10500,
      })
    );
    expect(resultado.valido).toBe(true);
  });

  it("rechaza un nivel de combustible fuera de rango", () => {
    const resultado = validarDatosCheckIn(datosValidos({ combustibleInicial: 150 }));
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes("combustible"))).toBe(true);
  });

  it("exige al menos una fotografía", () => {
    const resultado = validarDatosCheckIn(datosValidos({ fotos: [] }));
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes("fotografía"))).toBe(true);
  });

  it("exige aceptar la responsiva", () => {
    const resultado = validarDatosCheckIn(datosValidos({ responsivaAceptada: false }));
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes("responsiva"))).toBe(true);
  });

  it("exige la firma electrónica", () => {
    const resultado = validarDatosCheckIn(datosValidos({ firmaElectronica: "" }));
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes("firma"))).toBe(true);
  });

  it("acumula todos los errores cuando faltan varios datos obligatorios", () => {
    const resultado = validarDatosCheckIn(
      datosValidos({ fotos: [], responsivaAceptada: false, firmaElectronica: "" })
    );
    expect(resultado.errores).toHaveLength(3);
  });
});
