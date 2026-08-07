/**
 * IProveedorUber — Uber for Business (cotizar y solicitar un viaje cuando
 * el comparador de alternativas recomienda o el colaborador elige Uber).
 *
 * El mock NUNCA debe dar a entender que reservó un Uber real: toda
 * cotización/solicitud trae `esSimulado: true` y un `mensaje` que lo dice
 * explícitamente; la UI que consuma este proveedor debe mostrar el badge
 * "Integración simulada" (components/badge-integracion-simulada.tsx) junto
 * al resultado.
 *
 * Reutiliza `calcularCostoUber`/`estimarFactorDemandaUber` de
 * `servicio-costos` (Chunk 4) para que la cotización simulada sea
 * consistente con el resto de la app — no reimplementa el cálculo de costo.
 *
 * Implementación real futura: sustituir `ProveedorUberMock` por un
 * adaptador que llame a la API de Uber for Business (OAuth2 + endpoints de
 * cotización/solicitud de viaje). Ver /lib/integraciones/README.md.
 */

import { calcularCostoUber, estimarFactorDemandaUber } from "@/lib/services/servicio-costos";
import type { MetaProveedor } from "./tipos";

export interface DatosViajeUber {
  km: number;
  duracionMinutos?: number;
  factorDemanda?: number;
  origen: string;
  destino: string;
  /** Nombre o identificador del pasajero, para el mensaje de confirmación. */
  pasajero: string;
}

export interface CotizacionUber {
  costoTotal: number;
  moneda: "MXN";
  desglose: Record<string, number>;
  factorDemanda: number;
  vigenciaMinutos: number;
  esSimulado: boolean;
  mensaje: string;
}

export interface ConfirmacionViajeUber {
  /** Folio simulado; una integración real devolvería aquí el id de viaje de la API de Uber. */
  referenciaProveedor: string;
  costoTotal: number;
  estado: "SOLICITADO";
  esSimulado: boolean;
  mensaje: string;
}

export interface IProveedorUber {
  meta: MetaProveedor;
  /** "Cotiza" el viaje (nunca falla; usa el factor de demanda actual si no se especifica uno). */
  cotizar(datos: Pick<DatosViajeUber, "km" | "duracionMinutos" | "factorDemanda">): Promise<CotizacionUber>;
  /** "Solicita" el viaje ya cotizado; devuelve una referencia de confirmación simulada. */
  solicitarViaje(datos: DatosViajeUber): Promise<ConfirmacionViajeUber>;
}

function generarReferenciaSimulada(): string {
  return `UBER-SIM-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

export class ProveedorUberMock implements IProveedorUber {
  meta: MetaProveedor = {
    nombre: "Mock interno de Uber for Business",
    esReal: false,
    notaSimulacion: "La cotización usa las tarifas configurables de la app; ningún viaje se solicita realmente.",
  };

  async cotizar(datos: Pick<DatosViajeUber, "km" | "duracionMinutos" | "factorDemanda">): Promise<CotizacionUber> {
    const ahora = new Date();
    const factorDemanda = datos.factorDemanda ?? estimarFactorDemandaUber(ahora, ahora.getHours());
    const resultado = calcularCostoUber({ km: datos.km, duracionMinutos: datos.duracionMinutos, factorDemanda });
    return {
      costoTotal: resultado.costoTotal,
      moneda: "MXN",
      desglose: resultado.desglose,
      factorDemanda,
      vigenciaMinutos: 10,
      esSimulado: true,
      mensaje: "Cotización simulada: no proviene de la API real de Uber for Business.",
    };
  }

  async solicitarViaje(datos: DatosViajeUber): Promise<ConfirmacionViajeUber> {
    const cotizacion = await this.cotizar(datos);
    return {
      referenciaProveedor: generarReferenciaSimulada(),
      costoTotal: cotizacion.costoTotal,
      estado: "SOLICITADO",
      esSimulado: true,
      mensaje: `Integración simulada: no se solicitó un Uber real para ${datos.pasajero} (${datos.origen} → ${datos.destino}). En producción esta llamada crearía el viaje en Uber for Business.`,
    };
  }
}

export const proveedorUber: IProveedorUber = new ProveedorUberMock();
