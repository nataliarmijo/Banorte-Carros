/**
 * Adaptador para el check-in digital (accesible desde una reservación en
 * estado "Vehículo asignado" o "Lista para check-in", Chunk 7): arma el
 * contexto de campo (vehículo, último mantenimiento, territorio) validando
 * la regla de negocio de asignación confirmada, y registra el CheckIn
 * moviendo la reservación y la solicitud a "En curso".
 */

import { db } from "@/lib/repositories/dexie";
import {
  checkInsRepository,
  registrosAuditoriaRepository,
  reservacionesRepository,
  solicitudesRepository,
  vehiculosRepository,
} from "@/lib/repositories/typed-repositories";
import type { CheckIn, EstadoSolicitud, Mantenimiento, Reservacion, Solicitud, Vehiculo } from "@/lib/models";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { esFechaSalidaVigente, validarDatosCheckIn } from "@/lib/services/servicio-checkin";
import { crearResultadoSinDatos, esResultadoSinDatos } from "@/lib/services/types";
import type { ResultadoSinDatos } from "@/lib/services/types";
import { ESTADO_LABELS } from "@/lib/ui/estado-solicitud";

const ESTADOS_PERMITEN_CHECKIN: EstadoSolicitud[] = ["ASIGNADA", "LISTA_CHECK_IN"];

export interface ContextoCheckIn {
  solicitud: Solicitud;
  reservacion: Reservacion;
  vehiculo: Vehiculo;
  ultimoMantenimiento: Mantenimiento | null;
  territorioNombre: string;
}

async function obtenerUltimoMantenimiento(vehiculoId: string): Promise<Mantenimiento | null> {
  const mantenimientos = await db.mantenimientos.where("vehiculoId").equals(vehiculoId).toArray();
  const realizados = mantenimientos
    .filter((m) => m.fechaRealizada)
    .sort((a, b) => (b.fechaRealizada as string).localeCompare(a.fechaRealizada as string));
  return realizados[0] ?? null;
}

/**
 * Arma el contexto necesario para la pantalla de check-in y aplica la regla
 * de negocio: exige una reservación con asignación de vehículo confirmada
 * (aprobada o auto-asignada), en un estado que permita check-in, y con la
 * fecha de salida vigente. Si algo no se cumple, devuelve un mensaje claro.
 */
export async function obtenerContextoCheckIn(reservacionId: string): Promise<ContextoCheckIn | ResultadoSinDatos> {
  const reservacion = await reservacionesRepository.getById(reservacionId);
  if (!reservacion) {
    return crearResultadoSinDatos(
      "Esta reservación no tiene una asignación de vehículo confirmada, así que no es posible hacer check-in."
    );
  }

  const solicitud = await solicitudesRepository.getById(reservacion.solicitudId);
  if (!solicitud) {
    return crearResultadoSinDatos("No se encontró la solicitud asociada a esta reservación.");
  }

  if (!ESTADOS_PERMITEN_CHECKIN.includes(solicitud.estadoSolicitud)) {
    return crearResultadoSinDatos(
      `El check-in solo está disponible cuando la solicitud está en "${ESTADO_LABELS.ASIGNADA}" o "${ESTADO_LABELS.LISTA_CHECK_IN}" (estado actual: "${ESTADO_LABELS[solicitud.estadoSolicitud]}").`
    );
  }

  if (reservacion.vehiculoId.startsWith("uber-")) {
    return crearResultadoSinDatos("Esta reservación es un viaje en Uber; no requiere check-in de vehículo.");
  }

  if (!esFechaSalidaVigente(reservacion.fechaInicio)) {
    const fecha = new Date(reservacion.fechaInicio).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
    return crearResultadoSinDatos(`El check-in aún no está disponible; podrás hacerlo más cerca de la salida programada (${fecha}).`);
  }

  const vehiculo = await vehiculosRepository.getById(reservacion.vehiculoId);
  if (!vehiculo) {
    return crearResultadoSinDatos(
      "Esta reservación no tiene una asignación de vehículo confirmada, así que no es posible hacer check-in."
    );
  }

  const ultimoMantenimiento = await obtenerUltimoMantenimiento(vehiculo.id);
  const territorio = PARAMS_CONFIG.territorios[vehiculo.territorioId as keyof typeof PARAMS_CONFIG.territorios];

  return {
    solicitud,
    reservacion,
    vehiculo,
    ultimoMantenimiento,
    territorioNombre: territorio?.nombre ?? vehiculo.territorioId,
  };
}

export interface RegistrarCheckInInput {
  reservacionId: string;
  usuarioId: string;
  ubicacion: string;
  kilometrajeInicial: number;
  combustibleInicial: number;
  fotos: string[];
  firmaElectronica: string;
  responsivaAceptada: boolean;
  observaciones?: string;
}

/**
 * Valida y registra el check-in: crea el CheckIn (usuario, fecha/hora, km
 * inicial, combustible inicial, fotos, firma), y pasa la reservación y la
 * solicitud a "En curso". El vehículo queda marcado como ocupado.
 */
export async function registrarCheckIn(input: RegistrarCheckInInput): Promise<CheckIn | ResultadoSinDatos> {
  const contexto = await obtenerContextoCheckIn(input.reservacionId);
  if (esResultadoSinDatos(contexto)) return contexto;

  const validacion = validarDatosCheckIn({
    kilometrajeInicial: input.kilometrajeInicial,
    kilometrajeActualVehiculo: contexto.vehiculo.kilometrajeActual,
    combustibleInicial: input.combustibleInicial,
    fotos: input.fotos,
    firmaElectronica: input.firmaElectronica,
    responsivaAceptada: input.responsivaAceptada,
  });
  if (!validacion.valido) {
    return crearResultadoSinDatos(validacion.errores.join(" "));
  }

  const ahora = new Date().toISOString();

  const checkIn: CheckIn = {
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: input.usuarioId,
    estatus: "ACTIVO",
    reservacionId: input.reservacionId,
    usuarioId: input.usuarioId,
    fechaHoraCheckIn: ahora,
    ubicacion: input.ubicacion,
    kilometrajeInicial: input.kilometrajeInicial,
    combustibleInicial: input.combustibleInicial,
    fotos: input.fotos,
    firmaElectronica: input.firmaElectronica,
    responsivaAceptada: input.responsivaAceptada,
    observaciones: input.observaciones || undefined,
  };
  await checkInsRepository.create(checkIn);

  await reservacionesRepository.update(contexto.reservacion.id, {
    estadoReservacion: "EN_CURSO",
    fechaActualizacion: ahora,
  });
  await solicitudesRepository.update(contexto.solicitud.id, {
    estadoSolicitud: "EN_CURSO",
    fechaActualizacion: ahora,
  });
  await vehiculosRepository.update(contexto.vehiculo.id, {
    estadoOperativo: "OCUPADO",
    disponibilidadActual: false,
    fechaActualizacion: ahora,
  });

  await registrosAuditoriaRepository.create({
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: input.usuarioId,
    estatus: "ACTIVO",
    entidad: "Reservacion",
    entidadId: contexto.reservacion.id,
    accion: "CHECK_IN",
    usuarioId: input.usuarioId,
    cambiosJson: JSON.stringify({
      kilometrajeInicial: input.kilometrajeInicial,
      combustibleInicial: input.combustibleInicial,
      fotos: input.fotos.length,
    }),
    fechaCambio: ahora,
  });

  return checkIn;
}
