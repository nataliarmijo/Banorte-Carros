import { describe, expect, it } from "vitest";
import { compararAlternativas } from "./servicio-comparador";
import { calcularCostoUber, calcularCostoVehiculo } from "./servicio-costos";
import type { BorradorSolicitud, VehiculoDisponible } from "./types";

const solicitudBase: BorradorSolicitud = {
  territorioOrigen: "CDMX",
  territorioDestino: "CDMX",
  distanciaEstimadaKm: 5,
  fecha: new Date(2026, 7, 10), // lunes 10-ago-2026, día laboral
  horaEstimada: 10, // dentro del horario laboral (8-18)
  pasajeros: 2,
  duracionEstimadaMinutos: 10,
};

function crearVehiculo(overrides: Partial<VehiculoDisponible> = {}): VehiculoDisponible {
  return {
    id: "veh-1",
    nombre: "Vehículo de prueba",
    tipo: "ASIGNADO",
    tipoVehiculo: "sedan-compacto",
    territorio: "CDMX",
    disponible: true,
    capacidad: 4,
    ...overrides,
  };
}

describe("servicioComparador.compararAlternativas", () => {
  it("recomienda Uber cuando no hay vehículo Pool ni Asignado disponible", () => {
    const resultado = compararAlternativas(solicitudBase, []);

    if (!("alternativas" in resultado)) {
      throw new Error("se esperaba un resultado válido, no 'Sin datos suficientes'");
    }
    expect(resultado.recomendada).toBe("UBER");
    expect(resultado.explicacion).toContain("no hay unidades Pool ni Asignado disponibles");
  });

  it("recomienda Uber cuando su costo es al menos 10% menor que la mejor alternativa vehicular", () => {
    const disponibles = [crearVehiculo({ id: "asig-1", tipo: "ASIGNADO" })];

    // Precondición del escenario: para un trayecto corto y rápido, Uber debe
    // ser al menos 10% más barato que el vehículo Asignado según la config actual.
    const costoVehiculo = calcularCostoVehiculo({
      km: solicitudBase.distanciaEstimadaKm,
      tipoVehiculo: "sedan-compacto",
      modalidad: "asignado",
      duracionMinutos: solicitudBase.duracionEstimadaMinutos,
    });
    const costoUber = calcularCostoUber({
      km: solicitudBase.distanciaEstimadaKm,
      duracionMinutos: solicitudBase.duracionEstimadaMinutos,
      factorDemanda: 1,
    });
    const ahorroUber = (costoVehiculo.costoTotal - costoUber.costoTotal) / costoVehiculo.costoTotal;
    expect(ahorroUber).toBeGreaterThanOrEqual(0.1);

    const resultado = compararAlternativas(solicitudBase, disponibles);

    if (!("alternativas" in resultado)) {
      throw new Error("se esperaba un resultado válido, no 'Sin datos suficientes'");
    }
    expect(resultado.recomendada).toBe("UBER");
    expect(resultado.explicacion).toContain("Uber");
  });

  it("recomienda Pool cuando hay una unidad compatible, disponible y de costo similar o menor al Asignado", () => {
    const solicitudLarga: BorradorSolicitud = {
      ...solicitudBase,
      distanciaEstimadaKm: 300,
      duracionEstimadaMinutos: 240,
    };
    const disponibles = [
      crearVehiculo({ id: "pool-1", tipo: "POOL", tipoVehiculo: "sedan-compacto" }),
      crearVehiculo({ id: "asig-1", tipo: "ASIGNADO", tipoVehiculo: "suv-asignado" }),
    ];

    const costoPool = calcularCostoVehiculo({
      km: solicitudLarga.distanciaEstimadaKm,
      tipoVehiculo: "sedan-compacto",
      modalidad: "pool",
      duracionMinutos: solicitudLarga.duracionEstimadaMinutos,
    });
    const costoAsignado = calcularCostoVehiculo({
      km: solicitudLarga.distanciaEstimadaKm,
      tipoVehiculo: "suv-asignado",
      modalidad: "asignado",
      duracionMinutos: solicitudLarga.duracionEstimadaMinutos,
    });
    const costoUber = calcularCostoUber({
      km: solicitudLarga.distanciaEstimadaKm,
      duracionMinutos: solicitudLarga.duracionEstimadaMinutos,
      factorDemanda: 1,
    });

    // Precondiciones del escenario: Pool es más barato (o similar) que el
    // Asignado, y Uber no le gana por el margen configurado.
    expect(costoPool.costoTotal).toBeLessThanOrEqual(costoAsignado.costoTotal);
    const mejorVehicular = Math.min(costoPool.costoTotal, costoAsignado.costoTotal);
    expect((mejorVehicular - costoUber.costoTotal) / mejorVehicular).toBeLessThan(0.1);

    const resultado = compararAlternativas(solicitudLarga, disponibles);

    if (!("alternativas" in resultado)) {
      throw new Error("se esperaba un resultado válido, no 'Sin datos suficientes'");
    }
    expect(resultado.recomendada).toBe("POOL");
  });

  it("retorna 'Sin datos suficientes' con distancia inválida en vez de dividir entre cero", () => {
    const resultado = compararAlternativas({ ...solicitudBase, distanciaEstimadaKm: 0 }, []);

    expect(resultado).toMatchObject({ exito: false, error: "Sin datos suficientes" });
  });

  it("marca aprobación especial cuando el viaje es fuera de horario laboral", () => {
    const disponibles = [crearVehiculo({ id: "asig-1", tipo: "ASIGNADO" })];
    const solicitudNocturna: BorradorSolicitud = { ...solicitudBase, horaEstimada: 22 };

    const resultado = compararAlternativas(solicitudNocturna, disponibles);

    if (!("alternativas" in resultado)) {
      throw new Error("se esperaba un resultado válido, no 'Sin datos suficientes'");
    }
    expect(resultado.requiereAprobacionEspecial).toBe(true);
    expect(resultado.motivoAprobacionEspecial).toContain("horario laboral");
  });
});
