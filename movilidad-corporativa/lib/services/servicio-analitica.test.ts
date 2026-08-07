import { describe, expect, it } from "vitest";
import {
  calcularCostoPorKmPorAlternativa,
  calcularEvolucionMensualAhorro,
  calcularAhorroPorGrupo,
  calcularKpisPrincipales,
  calcularMesesEnPeriodo,
  calcularRoiEstimado,
  calcularSeccionEmisiones,
  calcularUtilizacionFlotilla,
  calcularUtilizacionPorTerritorio,
  calcularVariacionPorcentaje,
  calcularVentanaAnterior,
  filtrarRegistros,
  generarRecomendaciones,
  type RegistroViaje,
  type VehiculoParaUtilizacion,
} from "./servicio-analitica";
import { calcularComposicionFlotilla } from "./servicio-flota";

function registro(overrides: Partial<RegistroViaje> = {}): RegistroViaje {
  return {
    solicitudId: "sol-1",
    reservacionId: "res-1",
    vehiculoId: "veh-1",
    fecha: new Date(2026, 5, 15),
    territorioId: "territorio-cdmx",
    area: "Ventas",
    tipoViaje: "Corporativo",
    modalidadRequerida: "POOL",
    modalidadVehiculo: "POOL",
    tipoVehiculo: "sedan-compacto",
    tipoCombustible: "GASOLINA",
    estadoSolicitud: "COMPLETADA",
    completado: true,
    distanciaKm: 20,
    costoMxn: 200,
    esEstimadoCosto: false,
    emisionesGramos: 3000,
    co2EvitadoGramos: 500,
    fueraDeHorario: false,
    finDeSemana: false,
    ...overrides,
  };
}

describe("filtrarRegistros", () => {
  const registros: RegistroViaje[] = [
    registro({ solicitudId: "a", territorioId: "territorio-cdmx", modalidadVehiculo: "POOL", area: "Ventas", tipoViaje: "Corporativo" }),
    registro({ solicitudId: "b", territorioId: "territorio-monterrey", modalidadVehiculo: "ASIGNADO", area: "Finanzas", tipoViaje: "Operativo" }),
    registro({ solicitudId: "c", territorioId: "territorio-cdmx", modalidadVehiculo: undefined, modalidadRequerida: "UBER", area: "Ventas", tipoViaje: "Corporativo" }),
  ];

  it("filtra por territorio", () => {
    const resultado = filtrarRegistros(registros, { territorioIds: ["territorio-cdmx"] });
    expect(resultado.map((r) => r.solicitudId)).toEqual(["a", "c"]);
  });

  it("filtra por modalidad (excluye registros sin vehículo de flotilla, p.ej. Uber)", () => {
    const resultado = filtrarRegistros(registros, { modalidades: ["POOL"] });
    expect(resultado.map((r) => r.solicitudId)).toEqual(["a"]);
  });

  it("filtra por medio de transporte (incluye Uber)", () => {
    const resultado = filtrarRegistros(registros, { mediosTransporte: ["UBER"] });
    expect(resultado.map((r) => r.solicitudId)).toEqual(["c"]);
  });

  it("filtra por rango de periodo (fin exclusivo)", () => {
    const conFecha = [
      registro({ solicitudId: "x", fecha: new Date(2026, 0, 15) }),
      registro({ solicitudId: "y", fecha: new Date(2026, 1, 1) }),
    ];
    const resultado = filtrarRegistros(conFecha, { periodoInicio: new Date(2026, 0, 1), periodoFin: new Date(2026, 1, 1) });
    expect(resultado.map((r) => r.solicitudId)).toEqual(["x"]);
  });

  it("combina múltiples filtros", () => {
    const resultado = filtrarRegistros(registros, { territorioIds: ["territorio-cdmx"], areas: ["Ventas"], tiposViaje: ["Corporativo"] });
    expect(resultado.map((r) => r.solicitudId)).toEqual(["a", "c"]);
  });
});

describe("calcularVariacionPorcentaje / ventana anterior / meses en periodo", () => {
  it("retorna null cuando no hay anterior o es cero", () => {
    expect(calcularVariacionPorcentaje(100, null)).toBeNull();
    expect(calcularVariacionPorcentaje(100, 0)).toBeNull();
  });

  it("calcula variación normal", () => {
    expect(calcularVariacionPorcentaje(120, 100)).toBe(20);
    expect(calcularVariacionPorcentaje(80, 100)).toBe(-20);
  });

  it("la ventana anterior tiene la misma duración e inmediatamente precede al periodo actual", () => {
    const inicio = new Date(2026, 5, 1);
    const fin = new Date(2026, 6, 1);
    const anterior = calcularVentanaAnterior(inicio, fin);
    expect(anterior.fin.getTime()).toBe(inicio.getTime());
    expect(anterior.fin.getTime() - anterior.inicio.getTime()).toBe(fin.getTime() - inicio.getTime());
  });

  it("meses en periodo nunca es cero (evita división entre 0)", () => {
    const mismaFecha = new Date(2026, 5, 1);
    expect(calcularMesesEnPeriodo(mismaFecha, mismaFecha)).toBeGreaterThan(0);
  });
});

describe("calcularUtilizacionFlotilla", () => {
  const vehiculos: VehiculoParaUtilizacion[] = [
    { id: "veh-1", nombre: "Veh 1", territorioId: "territorio-cdmx", modalidad: "POOL" },
    { id: "veh-2", nombre: "Veh 2", territorioId: "territorio-cdmx", modalidad: "ASIGNADO" },
  ];

  it("clasifica subutilizado, normal y sobreutilizado contra los umbrales escalados al periodo", () => {
    // 1 mes de periodo: min=6, max=26 (ANALITICA_CONFIG por defecto)
    const registros = [
      ...Array.from({ length: 2 }, (_, i) => registro({ solicitudId: `p${i}`, vehiculoId: "veh-1" })), // 2 viajes -> subutilizado
      ...Array.from({ length: 30 }, (_, i) => registro({ solicitudId: `a${i}`, vehiculoId: "veh-2", modalidadVehiculo: "ASIGNADO" })), // 30 -> sobreutilizado
    ];
    const resumen = calcularUtilizacionFlotilla(vehiculos, registros, 1);
    expect(resumen.porVehiculo.find((v) => v.vehiculoId === "veh-1")?.clasificacion).toBe("SUBUTILIZADO");
    expect(resumen.porVehiculo.find((v) => v.vehiculoId === "veh-2")?.clasificacion).toBe("SOBREUTILIZADO");
    expect(resumen.subutilizados).toBe(1);
    expect(resumen.sobreutilizados).toBe(1);
  });

  it("acota la utilización a 100% aunque el vehículo exceda la capacidad", () => {
    const registros = Array.from({ length: 100 }, (_, i) => registro({ solicitudId: `x${i}`, vehiculoId: "veh-1" }));
    const resumen = calcularUtilizacionFlotilla(vehiculos, registros, 1);
    expect(resumen.porVehiculo.find((v) => v.vehiculoId === "veh-1")?.utilizacionPorcentaje).toBe(100);
  });

  it("un vehículo sin viajes registra 0% y sin datos de promedio si la flota está vacía", () => {
    const resumen = calcularUtilizacionFlotilla([], [], 1);
    expect(resumen.promedioPoolPorcentaje).toBeNull();
    expect(resumen.promedioAsignadoPorcentaje).toBeNull();
  });

  it("calcularUtilizacionPorTerritorio agrupa correctamente por territorio", () => {
    const vehiculosDosTerritorios: VehiculoParaUtilizacion[] = [
      { id: "veh-1", nombre: "Veh 1", territorioId: "territorio-cdmx", modalidad: "POOL" },
      { id: "veh-2", nombre: "Veh 2", territorioId: "territorio-monterrey", modalidad: "POOL" },
    ];
    const registros = [registro({ vehiculoId: "veh-1", territorioId: "territorio-cdmx" })];
    const resultado = calcularUtilizacionPorTerritorio(vehiculosDosTerritorios, registros, 1);
    expect(resultado).toHaveLength(2);
    const cdmx = resultado.find((r) => r.territorioId === "territorio-cdmx");
    const mty = resultado.find((r) => r.territorioId === "territorio-monterrey");
    expect(cdmx?.utilizacionPromedio).toBeGreaterThan(0);
    expect(mty?.utilizacionPromedio).toBe(0);
  });
});

describe("calcularCostoPorKmPorAlternativa", () => {
  it("retorna costoPromedioPorKm null cuando no hay km recorridos para una alternativa (sin datos suficientes)", () => {
    const resultado = calcularCostoPorKmPorAlternativa([registro({ modalidadVehiculo: "POOL" })]);
    const uber = resultado.find((r) => r.alternativa === "UBER");
    expect(uber?.costoPromedioPorKm).toBeNull();
    expect(uber?.viajes).toBe(0);
  });

  it("calcula el costo promedio por km correctamente", () => {
    const resultado = calcularCostoPorKmPorAlternativa([registro({ distanciaKm: 10, costoMxn: 100, modalidadVehiculo: "POOL" })]);
    expect(resultado.find((r) => r.alternativa === "POOL")?.costoPromedioPorKm).toBe(10);
  });
});

describe("calcularAhorroPorGrupo / calcularEvolucionMensualAhorro", () => {
  it("marca sin datos cuando el grupo no tiene viajes válidos", () => {
    const resultado = calcularAhorroPorGrupo([registro({ distanciaKm: 0 })], (r) => r.territorioId);
    expect(resultado[0].ahorro).toMatchObject({ exito: false });
  });

  it("evolución mensual retorna null en meses sin datos, sin romperse", () => {
    const ahora = new Date(2026, 5, 15);
    const serie = calcularEvolucionMensualAhorro([registro({ fecha: new Date(2026, 5, 1) })], 3, ahora);
    expect(serie).toHaveLength(3);
    expect(serie[0].ahorro).toBeNull();
    expect(serie[2].ahorro).not.toBeNull();
  });
});

describe("calcularRoiEstimado", () => {
  it("retorna null si la inversión configurada es cero o inválida", () => {
    expect(calcularRoiEstimado(1000, 0)).toBeNull();
    expect(calcularRoiEstimado(1000, -5)).toBeNull();
  });

  it("calcula el retorno porcentual", () => {
    expect(calcularRoiEstimado(50000, 100000)).toBe(50);
  });
});

describe("calcularSeccionEmisiones", () => {
  it("no rompe con listas vacías y retorna 'sin datos' vía nulls", () => {
    const seccion = calcularSeccionEmisiones([], [], 3, new Date(2026, 5, 1));
    expect(seccion.totalEmitidoKg).toBe(0);
    expect(seccion.emitidoPorKmGramos).toBeNull();
    expect(seccion.emitidoPorViajeGramos).toBeNull();
    expect(seccion.factoresUsados.length).toBeGreaterThan(0);
  });
});

describe("calcularKpisPrincipales", () => {
  const vehiculosFlota: VehiculoParaUtilizacion[] = [
    { id: "veh-1", nombre: "Veh 1", territorioId: "territorio-cdmx", modalidad: "POOL" },
    { id: "veh-2", nombre: "Veh 2", territorioId: "territorio-cdmx", modalidad: "ASIGNADO" },
  ];

  it("marca sinDatosAnterior cuando no hay ventana anterior", () => {
    const kpis = calcularKpisPrincipales({
      vehiculosFlota,
      actual: { registros: [registro()], incidencias: [] },
      anterior: null,
      mesesEnPeriodo: 1,
      metaUtilizacionPorcentaje: 75,
      metaPoolPorcentaje: 60,
      metaAsignadoPorcentaje: 40,
    });
    for (const kpi of kpis) {
      expect(kpi.sinDatosAnterior).toBe(true);
      expect(kpi.variacionPorcentaje).toBeNull();
    }
  });

  it("calcula variación cuando sí hay periodo anterior", () => {
    const kpis = calcularKpisPrincipales({
      vehiculosFlota,
      actual: { registros: [registro(), registro({ solicitudId: "sol-2" })], incidencias: [] },
      anterior: { registros: [registro({ solicitudId: "sol-3" })], incidencias: [] },
      mesesEnPeriodo: 1,
      metaUtilizacionPorcentaje: 75,
      metaPoolPorcentaje: 60,
      metaAsignadoPorcentaje: 40,
    });
    const viajesCompletados = kpis.find((k) => k.id === "viajes-completados")!;
    expect(viajesCompletados.valorActual).toBe(2);
    expect(viajesCompletados.valorAnterior).toBe(1);
    expect(viajesCompletados.variacionPorcentaje).toBe(100);
  });

  it("no rompe con cero unidades de flotilla ('sin datos suficientes' vía valores en null/0)", () => {
    const kpis = calcularKpisPrincipales({
      vehiculosFlota: [],
      actual: { registros: [], incidencias: [] },
      anterior: null,
      mesesEnPeriodo: 1,
      metaUtilizacionPorcentaje: 75,
      metaPoolPorcentaje: 60,
      metaAsignadoPorcentaje: 40,
    });
    expect(kpis.find((k) => k.id === "pct-pool")?.valorActual).toBe(0);
    expect(kpis.find((k) => k.id === "tasa-aprobacion")?.valorActual).toBe(0);
  });
});

describe("generarRecomendaciones", () => {
  it("recomienda incrementar Pool cuando la composición está por debajo de la meta", () => {
    const composicion = calcularComposicionFlotilla([{ modalidad: "ASIGNADO" }, { modalidad: "ASIGNADO" }, { modalidad: "POOL" }]);
    const recomendaciones = generarRecomendaciones({
      composicion,
      metaPoolPorcentaje: 60,
      porVehiculoUtilizacion: [],
      porTerritorioUtilizacion: [],
      costoPorAlternativa: calcularCostoPorKmPorAlternativa([]),
      costoPorVehiculo: [],
      registrosCompletados: [],
    });
    expect(recomendaciones.some((r) => r.id === "incrementar-pool-hacia-meta")).toBe(true);
  });

  it("recomienda migrar Asignado subutilizado a Pool cuando hay unidades ASIGNADO subutilizadas", () => {
    const recomendaciones = generarRecomendaciones({
      composicion: calcularComposicionFlotilla([{ modalidad: "POOL" }]),
      metaPoolPorcentaje: 0,
      porVehiculoUtilizacion: [
        { vehiculoId: "veh-2", nombre: "Veh 2", territorioId: "territorio-monterrey", modalidad: "ASIGNADO", viajes: 1, utilizacionPorcentaje: 5, clasificacion: "SUBUTILIZADO" },
      ],
      porTerritorioUtilizacion: [],
      costoPorAlternativa: calcularCostoPorKmPorAlternativa([]),
      costoPorVehiculo: [],
      registrosCompletados: [],
    });
    expect(recomendaciones.some((r) => r.id === "migrar-asignado-a-pool" && r.texto.includes("Monterrey"))).toBe(true);
  });

  it("recomienda mantenimiento para las unidades con mayor costo por km", () => {
    const recomendaciones = generarRecomendaciones({
      composicion: calcularComposicionFlotilla([{ modalidad: "POOL" }]),
      metaPoolPorcentaje: 0,
      porVehiculoUtilizacion: [],
      porTerritorioUtilizacion: [],
      costoPorAlternativa: calcularCostoPorKmPorAlternativa([]),
      costoPorVehiculo: [{ vehiculoId: "veh-9", nombre: "Veh Caro", costoPromedioPorKm: 15, viajes: 5 }],
      registrosCompletados: [],
    });
    expect(recomendaciones.some((r) => r.id === "mantenimiento-mayor-costo-km" && r.texto.includes("Veh Caro"))).toBe(true);
  });

  it("no genera recomendaciones cuando no hay señales (todo en meta, sin subutilización)", () => {
    const composicionEnMeta = calcularComposicionFlotilla([{ modalidad: "POOL" }, { modalidad: "POOL" }, { modalidad: "ASIGNADO" }]);
    const recomendaciones = generarRecomendaciones({
      composicion: composicionEnMeta,
      metaPoolPorcentaje: 60,
      porVehiculoUtilizacion: [],
      porTerritorioUtilizacion: [],
      costoPorAlternativa: calcularCostoPorKmPorAlternativa([]),
      costoPorVehiculo: [],
      registrosCompletados: [],
    });
    expect(recomendaciones).toEqual([]);
  });
});
