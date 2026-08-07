/**
 * Adaptador para /mapa: arma posiciones SIMULADAS de la flotilla Pool/
 * Asignado y de los orígenes de las solicitudes activas, a partir de las
 * coordenadas reales de cada territorio (PARAMS_CONFIG) más un
 * desplazamiento pseudoaleatorio determinístico por vehículo/solicitud —
 * el proyecto no tiene un proveedor de mapas/GPS real conectado.
 *
 * Punto de integración futura (Chunk 18, telemetría real): sustituir
 * `simularPosicion` por una lectura real de latitud/longitud/velocidad
 * reportada por un proveedor de GPS/telemática (p. ej. un webhook o
 * polling periódico a la API del proveedor que alimente la tabla
 * `ubicacionesGPS`), y usar su `timestampLectura` real en vez de
 * `ultimaActualizacion` simulada aquí.
 */

import { db } from "@/lib/repositories/dexie";
import type { EstadoSolicitud, Reservacion, Solicitud, Vehiculo } from "@/lib/models";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { estaFueraDeHorarioLaboral } from "@/lib/services/servicio-checkout";

/** Bounding box aproximado de México (lat/lon), usado solo para proyectar los territorios en el mapa esquemático. */
export const MEXICO_BOUNDS = {
  latMin: 14.5,
  latMax: 32.7,
  lonMin: -118.4,
  lonMax: -86.7,
};

export type EstadoMapaVehiculo = "DISPONIBLE" | "EN_USO" | "FUERA_DE_HORARIO" | "EN_MANTENIMIENTO" | "BLOQUEADO";

const ESTADOS_RESERVACION_ACTIVOS_FUTURO: EstadoSolicitud[] = ["ASIGNADA", "LISTA_CHECK_IN"];
const ESTADOS_SOLICITUD_ACTIVA: EstadoSolicitud[] = ["PENDIENTE_APROBACION", "APROBADA", "ASIGNADA", "LISTA_CHECK_IN"];

function hashCadena(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Desplazamiento pseudoaleatorio pero determinístico (mismo id -> misma posición) alrededor de un centro, en grados. */
function desplazamientoSimulado(id: string, radioMaximoGrados: number): { dLat: number; dLon: number } {
  const hash = hashCadena(id);
  const angulo = (hash % 360) * (Math.PI / 180);
  const radio = (((hash >>> 8) % 100) / 100) * radioMaximoGrados;
  return { dLat: Math.sin(angulo) * radio, dLon: Math.cos(angulo) * radio };
}

function nombreTerritorio(territorioId: string): string {
  const territorio = PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios];
  return territorio?.nombre ?? territorioId;
}

/** Posición simulada de un vehículo: centro del territorio + desplazamiento propio, para que no se amontonen exactamente. */
function simularPosicionVehiculo(territorioId: string, vehiculoId: string): { latitud: number; longitud: number } | null {
  const territorio = PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios];
  if (!territorio) return null;
  const { dLat, dLon } = desplazamientoSimulado(vehiculoId, 0.7);
  return { latitud: territorio.latitud + dLat, longitud: territorio.longitud + dLon };
}

export function calcularEstadoMapa(vehiculo: Vehiculo, ahora: Date): EstadoMapaVehiculo {
  if (vehiculo.estadoOperativo === "FUERA_DE_SERVICIO") return "BLOQUEADO";
  if (vehiculo.estadoOperativo === "EN_MANTENIMIENTO") return "EN_MANTENIMIENTO";
  if (vehiculo.estadoOperativo === "OCUPADO") {
    return estaFueraDeHorarioLaboral(ahora) ? "FUERA_DE_HORARIO" : "EN_USO";
  }
  return "DISPONIBLE";
}

/** Minutos simulados desde la "última actualización" del GPS: determinístico por vehículo, entre 1 y 20 minutos. */
function minutosSimuladosDesdeActualizacion(vehiculoId: string): number {
  return 1 + (hashCadena(vehiculoId) % 20);
}

export interface ProximaReservacionMapa {
  folio: string;
  fechaInicio: string;
}

export interface VehiculoMapa {
  vehiculo: Vehiculo;
  territorioNombre: string;
  estadoMapa: EstadoMapaVehiculo;
  posicion: { latitud: number; longitud: number };
  conductorActualNombre: string | null;
  /** Timestamp ISO; real si existe una lectura en `ubicacionesGPS`, simulado en caso contrario. */
  ultimaActualizacion: string;
  actualizacionEsSimulada: boolean;
  proximaReservacion: ProximaReservacionMapa | null;
}

export interface OrigenSolicitudMapa {
  solicitud: Solicitud;
  territorioNombre: string;
  posicion: { latitud: number; longitud: number };
  solicitanteNombre: string;
}

export interface DatosMapa {
  vehiculos: VehiculoMapa[];
  origenesSolicitudes: OrigenSolicitudMapa[];
  generadoEn: string;
}

export async function obtenerDatosMapa(): Promise<DatosMapa> {
  const ahora = new Date();
  const [vehiculosFlota, reservaciones, solicitudesActivas, usuarios, lecturasGPS] = await Promise.all([
    db.vehiculos.where("modalidad").anyOf(["POOL", "ASIGNADO"]).toArray(),
    db.reservaciones.toArray(),
    db.solicitudes.where("estadoSolicitud").anyOf(ESTADOS_SOLICITUD_ACTIVA as string[]).toArray(),
    db.usuarios.toArray(),
    db.ubicacionesGPS.toArray(),
  ]);

  const nombrePorUsuario = new Map(usuarios.map((u) => [u.id, u.nombreCompleto]));
  const solicitudPorId = new Map<string, Solicitud>();
  const reservacionesPorVehiculo = new Map<string, Reservacion[]>();
  for (const r of reservaciones) {
    const lista = reservacionesPorVehiculo.get(r.vehiculoId) ?? [];
    lista.push(r);
    reservacionesPorVehiculo.set(r.vehiculoId, lista);
  }

  const solicitudIdsNecesarios = new Set(reservaciones.map((r) => r.solicitudId));
  const solicitudesReferenciadas = await Promise.all([...solicitudIdsNecesarios].map((id) => db.solicitudes.get(id)));
  for (const s of solicitudesReferenciadas) {
    if (s) solicitudPorId.set(s.id, s);
  }

  const ultimaLecturaPorVehiculo = new Map<string, string>();
  for (const lectura of lecturasGPS) {
    const actual = ultimaLecturaPorVehiculo.get(lectura.vehiculoId);
    if (!actual || lectura.timestampLectura > actual) {
      ultimaLecturaPorVehiculo.set(lectura.vehiculoId, lectura.timestampLectura);
    }
  }

  const vehiculosMapa: VehiculoMapa[] = vehiculosFlota
    .map((vehiculo): VehiculoMapa | null => {
      const posicion = simularPosicionVehiculo(vehiculo.territorioId, vehiculo.id);
      if (!posicion) return null;

      const reservacionesVehiculo = reservacionesPorVehiculo.get(vehiculo.id) ?? [];
      const reservacionEnCurso = reservacionesVehiculo.find((r) => r.estadoReservacion === "EN_CURSO");
      const conductorActualNombre = reservacionEnCurso
        ? (nombrePorUsuario.get(solicitudPorId.get(reservacionEnCurso.solicitudId)?.usuarioSolicitanteId ?? "") ?? null)
        : null;

      const proximas = reservacionesVehiculo
        .filter((r) => ESTADOS_RESERVACION_ACTIVOS_FUTURO.includes(r.estadoReservacion) && new Date(r.fechaInicio).getTime() > ahora.getTime())
        .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
      const proximaReservacionRaw = proximas[0];
      const proximaReservacion: ProximaReservacionMapa | null = proximaReservacionRaw
        ? {
            folio: solicitudPorId.get(proximaReservacionRaw.solicitudId)?.folio ?? "—",
            fechaInicio: proximaReservacionRaw.fechaInicio,
          }
        : null;

      const lecturaReal = ultimaLecturaPorVehiculo.get(vehiculo.id);

      return {
        vehiculo,
        territorioNombre: nombreTerritorio(vehiculo.territorioId),
        estadoMapa: calcularEstadoMapa(vehiculo, ahora),
        posicion,
        conductorActualNombre,
        ultimaActualizacion: lecturaReal ?? new Date(ahora.getTime() - minutosSimuladosDesdeActualizacion(vehiculo.id) * 60 * 1000).toISOString(),
        actualizacionEsSimulada: !lecturaReal,
        proximaReservacion,
      };
    })
    .filter((v): v is VehiculoMapa => v !== null);

  const origenesSolicitudes: OrigenSolicitudMapa[] = solicitudesActivas
    .map((solicitud): OrigenSolicitudMapa | null => {
      const territorio = PARAMS_CONFIG.territorios[solicitud.territorioId as keyof typeof PARAMS_CONFIG.territorios];
      if (!territorio) return null;
      const { dLat, dLon } = desplazamientoSimulado(`solicitud-${solicitud.id}`, 0.85);
      return {
        solicitud,
        territorioNombre: territorio.nombre,
        posicion: { latitud: territorio.latitud + dLat, longitud: territorio.longitud + dLon },
        solicitanteNombre: nombrePorUsuario.get(solicitud.usuarioSolicitanteId) ?? "Usuario desconocido",
      };
    })
    .filter((o): o is OrigenSolicitudMapa => o !== null);

  return { vehiculos: vehiculosMapa, origenesSolicitudes, generadoEn: ahora.toISOString() };
}

/** Proyecta lat/lon a coordenadas 0-100 (%) dentro de un lienzo rectangular, usando el bounding box de México. */
export function proyectarPosicion(posicion: { latitud: number; longitud: number }): { xPorcentaje: number; yPorcentaje: number } {
  const { latMin, latMax, lonMin, lonMax } = MEXICO_BOUNDS;
  const xPorcentaje = ((posicion.longitud - lonMin) / (lonMax - lonMin)) * 100;
  const yPorcentaje = ((latMax - posicion.latitud) / (latMax - latMin)) * 100;
  return { xPorcentaje, yPorcentaje };
}
