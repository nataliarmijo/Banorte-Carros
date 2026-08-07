/**
 * Generador determinista de datos históricos (Chunk 2: ~12 meses) para
 * alimentar /analitica. Es ADITIVO: no reemplaza ni modifica el seed base
 * (demo-data.ts) ni los vehículos/usuarios/territorios existentes — sólo
 * agrega Solicitudes/Reservaciones/CheckOuts/Incidencias nuevas, con ids
 * propios ("*-hist-*") que no colisionan con los del seed base, para no
 * afectar ninguna prueba ni pantalla que dependa de los conteos originales.
 *
 * Usa los servicios puros de costos/emisiones del Chunk 4
 * (servicio-costos, servicio-emisiones) para que las cifras generadas sean
 * consistentes con las que calcula el resto de la aplicación.
 */

import { PARAMS_CONFIG } from "@/lib/config/params";
import { COSTOS_CONFIG } from "@/lib/config/costos";
import { ANALITICA_CONFIG } from "@/lib/config/analitica";
import { calcularCostoUber, calcularCostoVehiculo, estimarFactorDemandaUber } from "@/lib/services/servicio-costos";
import { calcularEmisionesUber, calcularEmisionesVehiculo } from "@/lib/services/servicio-emisiones";
import { estaFueraDeHorarioLaboral } from "@/lib/services/servicio-checkout";
import { mapTipoCombustible, mapTipoVehiculo } from "@/lib/adapters/flota";
import type {
  CheckOut,
  Incidencia,
  ModalidadVehiculo,
  Reservacion,
  Solicitud,
  TipoIncidencia,
  Usuario,
  Vehiculo,
} from "@/lib/models";
import type { ModalidadFlota } from "@/lib/config/costos";
import type { NivelPrioridad } from "@/lib/models";

// ---------------------------------------------------------------------------
// PRNG determinista (mulberry32): misma semilla -> misma secuencia siempre,
// para que los datos históricos (y cualquier prueba sobre ellos) sean estables.
// ---------------------------------------------------------------------------
function crearGeneradorAleatorio(semilla: number) {
  let estado = semilla >>> 0;
  return function siguiente(): number {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function entero(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function elegir<T>(rand: () => number, opciones: readonly T[]): T {
  return opciones[entero(rand, 0, opciones.length - 1)];
}

function estimarDuracionMinutos(distanciaKm: number): number {
  return Math.max(10, Math.round((distanciaKm / 35) * 60));
}

function pad6(n: number): string {
  return String(n).padStart(6, "0");
}

function fechaLocalISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function hhmm(fecha: Date): string {
  return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
}

const MOTIVOS_VIAJE = [
  "Visita a cliente",
  "Reunión ejecutiva",
  "Entrega de documentos",
  "Visita de operaciones",
  "Auditoría de sucursal",
  "Capacitación",
  "Evento corporativo",
  "Firma de contrato",
  "Supervisión de obra",
  "Traslado a aeropuerto",
];
const TIPOS_VIAJE = ["Corporativo", "Operativo"];
const TIPOS_INCIDENCIA_HISTORICOS: TipoIncidencia[] = [
  "USO_FUERA_DE_HORARIO",
  "FIN_DE_SEMANA_NO_AUTORIZADO",
  "DANOS",
  "RETRASO",
  "DIFERENCIA_COMBUSTIBLE",
  "DOCUMENTACION_VENCIDA",
  "MANTENIMIENTO_VENCIDO",
  "ACCIDENTE",
  "DESVIACION_RUTA",
];
const SEVERIDADES: NivelPrioridad[] = ["BAJA", "MEDIA", "ALTA", "CRITICA"];

export interface DatosHistoricos {
  solicitudes: Solicitud[];
  reservaciones: Reservacion[];
  checkOuts: CheckOut[];
  incidencias: Incidencia[];
}

interface VehiculoConTrips {
  vehiculo: Vehiculo;
  reservacionesDelMes: { reservacionId: string; solicitudId: string }[];
}

/**
 * Genera ~ANALITICA_CONFIG.mesesHistoricos meses de solicitudes/reservaciones/
 * check-outs/incidencias completadas, usando los vehículos y territorios ya
 * existentes en el seed base. Determinista (semilla fija).
 */
export function generarDatosHistoricos(
  vehiculosBase: Vehiculo[],
  usuariosBase: Usuario[],
  ahora: Date = new Date()
): DatosHistoricos {
  const rand = crearGeneradorAleatorio(20260215);

  const solicitudes: Solicitud[] = [];
  const reservaciones: Reservacion[] = [];
  const checkOuts: CheckOut[] = [];
  const incidencias: Incidencia[] = [];

  const vehiculosFlota = vehiculosBase.filter((v) => v.modalidad === "POOL" || v.modalidad === "ASIGNADO");
  const colaboradores = usuariosBase.filter((u) => u.rol === "COLABORADOR");
  const territorioIds = Object.keys(PARAMS_CONFIG.territorios);

  let folioSecuencial = 500000;
  let solicitudIdSecuencial = 0;
  const reservacionesDelMesPorVehiculo = new Map<string, { reservacionId: string; solicitudId: string; fechaFin: Date }[]>();

  function siguienteFolio(anio: number): string {
    folioSecuencial += 1;
    return `MOV-${anio}-${pad6(folioSecuencial)}`;
  }

  function colaboradorDeTerritorio(territorioId: string): Usuario {
    const candidatos = colaboradores.filter((u) => u.territorioId === territorioId);
    return candidatos.length > 0 ? elegir(rand, candidatos) : elegir(rand, colaboradores);
  }

  for (let mesesAtras = ANALITICA_CONFIG.mesesHistoricos - 1; mesesAtras >= 0; mesesAtras--) {
    const anclaMes = new Date(ahora.getFullYear(), ahora.getMonth() - mesesAtras, 1);
    const diasEnMes = new Date(anclaMes.getFullYear(), anclaMes.getMonth() + 1, 0).getDate();
    const esMesActual = mesesAtras === 0;
    const diaMaximo = esMesActual ? Math.max(1, ahora.getDate() - 1) : diasEnMes;

    // --- Viajes en flotilla (Pool/Asignado) ---
    for (const vehiculo of vehiculosFlota) {
      const tipoVehiculo = mapTipoVehiculo(vehiculo);
      const tipoCombustible = mapTipoCombustible(vehiculo.combustibleTipo);
      const modalidadFlota: ModalidadFlota = vehiculo.modalidad === "POOL" ? "pool" : "asignado";
      const rendimientoKmLitro = COSTOS_CONFIG.vehiculos[tipoVehiculo]?.rendimientoKmLitro ?? 0;
      const numeroTrips = entero(rand, 4, 9);
      const reservacionesDelMes: { reservacionId: string; solicitudId: string; fechaFin: Date }[] = [];

      for (let t = 0; t < numeroTrips; t++) {
        const dia = entero(rand, 1, Math.max(1, Math.min(diaMaximo, diasEnMes)));
        const esFinDeSemanaForzado = rand() < 0.06; // 6% de los viajes simulan uso en fin de semana
        const horaBase = esFinDeSemanaForzado ? entero(rand, 9, 18) : entero(rand, 7, 19);
        const fechaSalida = new Date(anclaMes.getFullYear(), anclaMes.getMonth(), dia, horaBase, elegir(rand, [0, 15, 30, 45]));
        if (esFinDeSemanaForzado) {
          // Empuja al fin de semana más cercano dentro del mismo mes cuando aplica.
          while (fechaSalida.getDay() !== 0 && fechaSalida.getDay() !== 6 && fechaSalida.getDate() < diasEnMes) {
            fechaSalida.setDate(fechaSalida.getDate() + 1);
          }
        }
        if (fechaSalida.getTime() > ahora.getTime()) continue; // nunca generar viajes en el futuro

        const distanciaKm = entero(rand, 4, 70);
        const duracionEstimadaMinutos = estimarDuracionMinutos(distanciaKm);
        const fechaRegreso = new Date(fechaSalida.getTime() + (duracionEstimadaMinutos + entero(rand, 30, 180)) * 60 * 1000);
        const pasajeros = entero(rand, 1, 3);

        const costo = calcularCostoVehiculo({ km: distanciaKm, tipoVehiculo, modalidad: modalidadFlota, duracionMinutos: duracionEstimadaMinutos });
        const emisiones = calcularEmisionesVehiculo({ km: distanciaKm, tipoVehiculo, rendimientoKmLitro, tipoCombustible });

        const azarEstado = rand();
        const estadoSolicitud: Solicitud["estadoSolicitud"] = azarEstado < 0.87 ? "COMPLETADA" : azarEstado < 0.94 ? "CANCELADA" : "RECHAZADA";

        solicitudIdSecuencial += 1;
        const solicitudId = `sol-hist-${solicitudIdSecuencial}`;
        const folio = siguienteFolio(fechaSalida.getFullYear());
        const colaborador = colaboradorDeTerritorio(vehiculo.territorioId);
        const nowIso = fechaSalida.toISOString();

        const solicitud: Solicitud = {
          id: solicitudId,
          fechaCreacion: nowIso,
          fechaActualizacion: nowIso,
          usuarioCreadorId: colaborador.id,
          estatus: "ACTIVO",
          folio,
          usuarioSolicitanteId: colaborador.id,
          territorioId: vehiculo.territorioId,
          fechaSolicitud: fechaLocalISO(fechaSalida),
          horaInicioDeseada: hhmm(fechaSalida),
          horaFinDeseada: hhmm(fechaRegreso),
          fechaRegreso: fechaLocalISO(fechaRegreso),
          origen: `Oficinas ${PARAMS_CONFIG.territorios[vehiculo.territorioId as keyof typeof PARAMS_CONFIG.territorios]?.nombre ?? vehiculo.territorioId}`,
          destino: elegir(rand, ["Sucursal", "Cliente corporativo", "Aeropuerto", "Centro de convenciones", "Planta"]),
          distanciaEstimadaKm: distanciaKm,
          duracionEstimadaMinutos,
          pasajeros,
          tipoVehiculoRequerido: tipoVehiculo,
          transportaEquipo: rand() < 0.15,
          motivoViaje: elegir(rand, MOTIVOS_VIAJE),
          tipoViaje: elegir(rand, TIPOS_VIAJE),
          modalidadRequerida: vehiculo.modalidad,
          costoEstimado: costo.costoTotal,
          emisionesEstimadasGramos: emisiones.totalGramosCo2,
          estadoSolicitud,
          prioridad: elegir(rand, ["BAJA", "MEDIA", "ALTA"] as const),
        };
        solicitudes.push(solicitud);

        if (estadoSolicitud !== "COMPLETADA") continue;

        const reservacionId = `res-hist-${solicitudIdSecuencial}`;
        const costoReal = costo.costoTotal * (0.9 + rand() * 0.2);
        const reservacion: Reservacion = {
          id: reservacionId,
          fechaCreacion: nowIso,
          fechaActualizacion: fechaRegreso.toISOString(),
          usuarioCreadorId: colaborador.id,
          estatus: "COMPLETADA",
          solicitudId,
          vehiculoId: vehiculo.id,
          modalidadAsignada: vehiculo.modalidad,
          fechaInicio: fechaSalida.toISOString(),
          fechaFin: fechaRegreso.toISOString(),
          costoEstimado: costo.costoTotal,
          costoReal,
          estadoReservacion: "COMPLETADA",
        };
        reservaciones.push(reservacion);
        reservacionesDelMes.push({ reservacionId, solicitudId, fechaFin: fechaRegreso });

        const emisionesReales = emisiones.totalGramosCo2 * (0.92 + rand() * 0.16);
        const fueraDeHorario = estaFueraDeHorarioLaboral(fechaSalida) || estaFueraDeHorarioLaboral(fechaRegreso);
        const checkOut: CheckOut = {
          id: `checkout-hist-${solicitudIdSecuencial}`,
          fechaCreacion: fechaRegreso.toISOString(),
          fechaActualizacion: fechaRegreso.toISOString(),
          usuarioCreadorId: colaborador.id,
          estatus: "COMPLETADA",
          reservacionId,
          usuarioId: colaborador.id,
          fechaHoraCheckOut: fechaRegreso.toISOString(),
          kilometrajeFinal: vehiculo.kilometrajeActual,
          combustibleRestante: entero(rand, 25, 90),
          fotos: [],
          estadoVehiculo: rand() < 0.05 ? "CON_OBSERVACIONES" : "BUENO",
          llavesDevueltas: true,
          kilometrosRecorridos: distanciaKm,
          duracionRealMinutos: duracionEstimadaMinutos + entero(rand, -5, 20),
          retrasoMinutos: rand() < 0.12 ? entero(rand, 5, 60) : 0,
          diferenciaCombustiblePorcentaje: entero(rand, -5, 15),
          fueraDeHorarioNoAutorizado: fueraDeHorario && rand() < 0.5,
          costoReal,
          emisionesRealesGramos: emisionesReales,
          incidenciasCreadasIds: [],
          observaciones: undefined,
        };
        checkOuts.push(checkOut);
      }

      reservacionesDelMesPorVehiculo.set(vehiculo.id, [
        ...(reservacionesDelMesPorVehiculo.get(vehiculo.id) ?? []),
        ...reservacionesDelMes,
      ]);
    }

    // --- Viajes en Uber (por territorio, sin vehículo de flotilla asociado) ---
    for (const territorioId of territorioIds) {
      const numeroTripsUber = entero(rand, 1, 4);
      for (let t = 0; t < numeroTripsUber; t++) {
        const dia = entero(rand, 1, Math.max(1, Math.min(diaMaximo, diasEnMes)));
        const hora = entero(rand, 7, 21);
        const fechaSalida = new Date(anclaMes.getFullYear(), anclaMes.getMonth(), dia, hora, elegir(rand, [0, 15, 30, 45]));
        if (fechaSalida.getTime() > ahora.getTime()) continue;

        const distanciaKm = entero(rand, 3, 40);
        const duracionEstimadaMinutos = estimarDuracionMinutos(distanciaKm);
        const factorDemanda = estimarFactorDemandaUber(fechaSalida, fechaSalida.getHours());
        const costo = calcularCostoUber({ km: distanciaKm, duracionMinutos: duracionEstimadaMinutos, factorDemanda });
        const emisiones = calcularEmisionesUber({ km: distanciaKm });

        const estadoSolicitud: Solicitud["estadoSolicitud"] = rand() < 0.92 ? "COMPLETADA" : "CANCELADA";
        solicitudIdSecuencial += 1;
        const solicitudId = `sol-hist-${solicitudIdSecuencial}`;
        const folio = siguienteFolio(fechaSalida.getFullYear());
        const colaborador = colaboradorDeTerritorio(territorioId);
        const fechaRegreso = new Date(fechaSalida.getTime() + duracionEstimadaMinutos * 60 * 1000);
        const nowIso = fechaSalida.toISOString();

        const solicitud: Solicitud = {
          id: solicitudId,
          fechaCreacion: nowIso,
          fechaActualizacion: nowIso,
          usuarioCreadorId: colaborador.id,
          estatus: "ACTIVO",
          folio,
          usuarioSolicitanteId: colaborador.id,
          territorioId,
          fechaSolicitud: fechaLocalISO(fechaSalida),
          horaInicioDeseada: hhmm(fechaSalida),
          horaFinDeseada: hhmm(fechaRegreso),
          fechaRegreso: fechaLocalISO(fechaRegreso),
          origen: `Oficinas ${PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios]?.nombre ?? territorioId}`,
          destino: elegir(rand, ["Sucursal", "Cliente corporativo", "Aeropuerto", "Centro de convenciones"]),
          distanciaEstimadaKm: distanciaKm,
          duracionEstimadaMinutos,
          pasajeros: entero(rand, 1, 2),
          tipoVehiculoRequerido: "sedan-compacto",
          transportaEquipo: false,
          motivoViaje: elegir(rand, MOTIVOS_VIAJE),
          tipoViaje: elegir(rand, TIPOS_VIAJE),
          modalidadRequerida: "UBER",
          costoEstimado: costo.costoTotal,
          emisionesEstimadasGramos: emisiones.totalGramosCo2,
          estadoSolicitud,
          prioridad: "BAJA",
        };
        solicitudes.push(solicitud);

        if (estadoSolicitud !== "COMPLETADA") continue;

        const reservacionId = `res-hist-${solicitudIdSecuencial}`;
        const reservacion: Reservacion = {
          id: reservacionId,
          fechaCreacion: nowIso,
          fechaActualizacion: fechaRegreso.toISOString(),
          usuarioCreadorId: colaborador.id,
          estatus: "COMPLETADA",
          solicitudId,
          vehiculoId: `uber-hist-${solicitudIdSecuencial}`,
          modalidadAsignada: "UBER",
          fechaInicio: fechaSalida.toISOString(),
          fechaFin: fechaRegreso.toISOString(),
          costoEstimado: costo.costoTotal,
          costoReal: costo.costoTotal,
          estadoReservacion: "COMPLETADA",
        };
        reservaciones.push(reservacion);
      }
    }

    // --- Incidencias del mes (dispersión moderada, sobre viajes de flotilla ya generados) ---
    const numeroIncidenciasDelMes = entero(rand, 1, 3);
    for (let i = 0; i < numeroIncidenciasDelMes; i++) {
      if (vehiculosFlota.length === 0) break;
      const vehiculo = elegir(rand, vehiculosFlota);
      const reservacionesVehiculo = reservacionesDelMesPorVehiculo.get(vehiculo.id) ?? [];
      const referencia = reservacionesVehiculo.length > 0 ? elegir(rand, reservacionesVehiculo) : null;
      const tipoIncidencia = elegir(rand, TIPOS_INCIDENCIA_HISTORICOS);
      const severidad: NivelPrioridad = rand() < 0.06 ? "CRITICA" : rand() < 0.25 ? "ALTA" : elegir(rand, SEVERIDADES.slice(0, 2));
      const colaborador = colaboradorDeTerritorio(vehiculo.territorioId);
      const fechaIncidencia = referencia?.fechaFin ?? new Date(anclaMes.getFullYear(), anclaMes.getMonth(), entero(rand, 1, diasEnMes));
      const fechaIso = fechaIncidencia.toISOString();
      const esReciente = mesesAtras <= 1;

      const incidencia: Incidencia = {
        id: `inc-hist-${anclaMes.getFullYear()}-${anclaMes.getMonth()}-${i}-${vehiculo.id}`,
        fechaCreacion: fechaIso,
        fechaActualizacion: fechaIso,
        usuarioCreadorId: colaborador.id,
        estatus: "ACTIVO",
        reservacionId: referencia?.reservacionId,
        vehiculoId: vehiculo.id,
        usuarioReportaId: colaborador.id,
        tipoIncidencia,
        severidad,
        descripcion: `${tipoIncidencia.replace(/_/g, " ").toLowerCase()} detectado en ${vehiculo.placa}.`,
        fotos: [],
        bitacora: [{ id: `${vehiculo.id}-${i}-bit-1`, fecha: fechaIso, usuarioId: colaborador.id, comentario: "Registro generado a partir del historial operativo." }],
        estadoIncidencia: esReciente ? elegir(rand, ["ABIERTA", "EN_PROCESO"] as const) : elegir(rand, ["RESUELTA", "CERRADA"] as const),
      };
      incidencias.push(incidencia);
    }

    reservacionesDelMesPorVehiculo.clear();
  }

  return { solicitudes, reservaciones, checkOuts, incidencias };
}
