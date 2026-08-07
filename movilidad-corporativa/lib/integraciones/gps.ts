/**
 * IProveedorGPS — telemetría/ubicación de la flotilla.
 *
 * Implementación real futura: sustituir `ProveedorGPSMock` por un adaptador
 * que reciba/consulte lecturas de un proveedor de GPS/telemática real (p.
 * ej. un webhook periódico que escriba en `db.ubicacionesGPS`, o polling a
 * la API del proveedor). Mientras exista una lectura real reciente en
 * `db.ubicacionesGPS` para un vehículo, este mock ya la prioriza sobre la
 * posición simulada — por eso conectar un proveedor real es, en principio,
 * sólo cuestión de empezar a llenar esa tabla con datos reales.
 *
 * Ver /lib/integraciones/README.md.
 */

import { db } from "@/lib/repositories/dexie";
import { PARAMS_CONFIG } from "@/lib/config/params";
import type { MetaProveedor } from "./tipos";

export interface LecturaGPS {
  vehiculoId: string;
  latitud: number;
  longitud: number;
  /** ISO. */
  timestampLectura: string;
  /** True si la lectura viene de `db.ubicacionesGPS` (simulada como "real" en el MVP); false si se generó al vuelo. */
  esLecturaAlmacenada: boolean;
}

export interface IProveedorGPS {
  meta: MetaProveedor;
  /** Última posición conocida de cada vehículo pedido (nunca falla: si no hay lectura real, produce una simulada consistente). */
  obtenerUltimasPosiciones(vehiculos: { id: string; territorioId: string }[]): Promise<Map<string, LecturaGPS>>;
}

/** Hash determinístico simple (mismo texto -> mismo número siempre); usado para que la simulación sea estable entre renders. */
export function hashCadena(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Desplazamiento pseudoaleatorio pero determinístico (mismo id -> mismo desplazamiento) alrededor de un centro, en grados. */
export function desplazamientoSimulado(id: string, radioMaximoGrados: number): { dLat: number; dLon: number } {
  const hash = hashCadena(id);
  const angulo = (hash % 360) * (Math.PI / 180);
  const radio = (((hash >>> 8) % 100) / 100) * radioMaximoGrados;
  return { dLat: Math.sin(angulo) * radio, dLon: Math.cos(angulo) * radio };
}

function minutosSimuladosDesdeActualizacion(vehiculoId: string): number {
  return 1 + (hashCadena(vehiculoId) % 20);
}

/**
 * Mock de telemetría: si hay una lectura real en `db.ubicacionesGPS` la usa
 * tal cual; si no, simula una posición estable alrededor del centro del
 * territorio del vehículo (mismo vehículo -> misma posición) y una
 * "antigüedad" de la lectura entre 1 y 20 minutos.
 */
export class ProveedorGPSMock implements IProveedorGPS {
  meta: MetaProveedor = {
    nombre: "Mock interno de GPS",
    esReal: false,
    notaSimulacion: "Las posiciones se calculan a partir del territorio del vehículo, no de un GPS real.",
  };

  async obtenerUltimasPosiciones(vehiculos: { id: string; territorioId: string }[]): Promise<Map<string, LecturaGPS>> {
    const lecturasGPS = await db.ubicacionesGPS.toArray();
    const ultimaLecturaPorVehiculo = new Map<string, { latitud: number; longitud: number; timestampLectura: string }>();
    for (const lectura of lecturasGPS) {
      const actual = ultimaLecturaPorVehiculo.get(lectura.vehiculoId);
      if (!actual || lectura.timestampLectura > actual.timestampLectura) {
        ultimaLecturaPorVehiculo.set(lectura.vehiculoId, lectura);
      }
    }

    const ahora = new Date();
    const resultado = new Map<string, LecturaGPS>();
    for (const vehiculo of vehiculos) {
      const real = ultimaLecturaPorVehiculo.get(vehiculo.id);
      if (real) {
        resultado.set(vehiculo.id, { vehiculoId: vehiculo.id, ...real, esLecturaAlmacenada: true });
        continue;
      }

      const territorio = PARAMS_CONFIG.territorios[vehiculo.territorioId as keyof typeof PARAMS_CONFIG.territorios];
      if (!territorio) continue;
      const { dLat, dLon } = desplazamientoSimulado(vehiculo.id, 0.7);
      resultado.set(vehiculo.id, {
        vehiculoId: vehiculo.id,
        latitud: territorio.latitud + dLat,
        longitud: territorio.longitud + dLon,
        timestampLectura: new Date(ahora.getTime() - minutosSimuladosDesdeActualizacion(vehiculo.id) * 60 * 1000).toISOString(),
        esLecturaAlmacenada: false,
      });
    }
    return resultado;
  }
}

export const proveedorGPS: IProveedorGPS = new ProveedorGPSMock();
