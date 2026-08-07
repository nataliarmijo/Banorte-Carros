import { describe, expect, it } from "vitest";
import { calcularComposicionFlotilla, calcularTendenciaUtilizacion } from "./servicio-flota";

describe("calcularComposicionFlotilla", () => {
  it("calcula el porcentaje Pool/Asignado excluyendo Uber", () => {
    const vehiculos = [
      { modalidad: "POOL" as const },
      { modalidad: "POOL" as const },
      { modalidad: "POOL" as const },
      { modalidad: "ASIGNADO" as const },
      { modalidad: "ASIGNADO" as const },
      { modalidad: "UBER" as const },
    ];

    const resultado = calcularComposicionFlotilla(vehiculos);

    expect(resultado.totalFlota).toBe(5); // excluye el Uber
    expect(resultado.poolCount).toBe(3);
    expect(resultado.asignadoCount).toBe(2);
    expect(resultado.poolPorcentaje).toBe(60);
    expect(resultado.asignadoPorcentaje).toBe(40);
  });

  it("un cambio de modalidad (Pool -> Asignado) mueve el conteo del 60/40 correctamente", () => {
    const vehiculos = [
      { modalidad: "POOL" as const },
      { modalidad: "POOL" as const },
      { modalidad: "POOL" as const },
      { modalidad: "ASIGNADO" as const },
      { modalidad: "ASIGNADO" as const },
    ];
    const antes = calcularComposicionFlotilla(vehiculos);
    expect(antes.poolPorcentaje).toBe(60);

    // Simula que el vehículo 0 cambió de POOL a ASIGNADO.
    const despues = calcularComposicionFlotilla([{ modalidad: "ASIGNADO" }, ...vehiculos.slice(1)]);
    expect(despues.poolCount).toBe(2);
    expect(despues.asignadoCount).toBe(3);
    expect(despues.poolPorcentaje).toBe(40);
    expect(despues.asignadoPorcentaje).toBe(60);
    expect(despues.totalFlota).toBe(antes.totalFlota);
  });

  it("retorna 0% cuando no hay flotilla", () => {
    const resultado = calcularComposicionFlotilla([]);
    expect(resultado).toEqual({ totalFlota: 0, poolCount: 0, asignadoCount: 0, poolPorcentaje: 0, asignadoPorcentaje: 0 });
  });
});

describe("calcularTendenciaUtilizacion", () => {
  it("cuenta los viajes de la semana actual y de semanas anteriores por separado", () => {
    const ahora = new Date("2026-08-12T10:00:00"); // miércoles
    const reservaciones = [
      { fechaInicio: "2026-08-10T09:00:00", estadoReservacion: "COMPLETADA" as const }, // esta semana (lunes)
      { fechaInicio: "2026-08-11T09:00:00", estadoReservacion: "EN_CURSO" as const }, // esta semana (martes)
      { fechaInicio: "2026-08-04T09:00:00", estadoReservacion: "COMPLETADA" as const }, // semana pasada
      { fechaInicio: "2026-07-21T09:00:00", estadoReservacion: "COMPLETADA" as const }, // hace 3 semanas
    ];

    const tendencia = calcularTendenciaUtilizacion(reservaciones, 4, ahora);

    expect(tendencia).toHaveLength(4);
    expect(tendencia[3]).toEqual({ etiqueta: "Esta semana", viajes: 2 });
    expect(tendencia[2].viajes).toBe(1);
    expect(tendencia[0].viajes).toBe(1);
  });

  it("excluye las reservaciones canceladas", () => {
    const ahora = new Date("2026-08-12T10:00:00");
    const reservaciones = [{ fechaInicio: "2026-08-11T09:00:00", estadoReservacion: "CANCELADA" as const }];

    const tendencia = calcularTendenciaUtilizacion(reservaciones, 1, ahora);
    expect(tendencia[0].viajes).toBe(0);
  });

  it("retorna el número de semanas solicitado, más reciente al final", () => {
    const tendencia = calcularTendenciaUtilizacion([], 6, new Date("2026-08-12T10:00:00"));
    expect(tendencia.map((p) => p.etiqueta)).toEqual([
      "Hace 5 semanas",
      "Hace 4 semanas",
      "Hace 3 semanas",
      "Hace 2 semanas",
      "Hace 1 semana",
      "Esta semana",
    ]);
  });
});
