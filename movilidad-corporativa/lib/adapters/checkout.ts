/**
 * Adaptador para el check-out digital (disponible para reservaciones en
 * estado "En curso"): arma el contexto de devolución (vehículo, check-in
 * original), calcula las cifras reales del viaje (km, duración, retraso,
 * combustible, costo real vía servicioCostos y emisiones reales vía
 * servicioEmisiones), crea Incidencias automáticas cuando corresponde
 * (Chunk 14) y cierra la reservación como "Completada".
 */

import { db } from "@/lib/repositories/dexie";
import {
  checkOutsRepository,
  incidenciasRepository,
  registrosAuditoriaRepository,
  reservacionesRepository,
  solicitudesRepository,
  vehiculosRepository,
} from "@/lib/repositories/typed-repositories";
import type {
  CheckIn,
  CheckOut,
  EstadoVehiculoDevolucion,
  Incidencia,
  Reservacion,
  Solicitud,
  Vehiculo,
} from "@/lib/models";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { COSTOS_CONFIG, type ModalidadFlota } from "@/lib/config/costos";
import { CHECKOUT_CONFIG } from "@/lib/config/checkout";
import { mapTipoCombustible, mapTipoVehiculo } from "@/lib/adapters/flota";
import { calcularCostoVehiculo } from "@/lib/services/servicio-costos";
import { calcularEmisionesVehiculo } from "@/lib/services/servicio-emisiones";
import {
  calcularDiferenciaCombustiblePorcentaje,
  calcularDuracionRealMinutos,
  calcularKilometrosRecorridos,
  calcularRetrasoMinutos,
  estabaAutorizadoFueraDeHorario,
  esUsoFueraDeHorario,
  validarDatosCheckOut,
} from "@/lib/services/servicio-checkout";
import { crearResultadoSinDatos, esResultadoSinDatos } from "@/lib/services/types";
import type { ResultadoSinDatos } from "@/lib/services/types";
import { ESTADO_LABELS } from "@/lib/ui/estado-solicitud";

export interface ContextoCheckOut {
  solicitud: Solicitud;
  reservacion: Reservacion;
  vehiculo: Vehiculo;
  checkIn: CheckIn;
  territorioNombre: string;
}

/**
 * Arma el contexto necesario para la pantalla de check-out: exige que la
 * solicitud esté "En curso" y que exista el check-in original de la
 * reservación (de donde salen el kilometraje y combustible iniciales).
 */
export async function obtenerContextoCheckOut(reservacionId: string): Promise<ContextoCheckOut | ResultadoSinDatos> {
  const reservacion = await reservacionesRepository.getById(reservacionId);
  if (!reservacion) {
    return crearResultadoSinDatos("No existe la reservación indicada.");
  }

  const solicitud = await solicitudesRepository.getById(reservacion.solicitudId);
  if (!solicitud) {
    return crearResultadoSinDatos("No se encontró la solicitud asociada a esta reservación.");
  }

  if (solicitud.estadoSolicitud !== "EN_CURSO") {
    return crearResultadoSinDatos(
      `El check-out solo está disponible cuando la solicitud está "${ESTADO_LABELS.EN_CURSO}" (estado actual: "${ESTADO_LABELS[solicitud.estadoSolicitud]}").`
    );
  }

  const checkIns = await db.checkIns.where("reservacionId").equals(reservacionId).toArray();
  const checkIn = checkIns[0];
  if (!checkIn) {
    return crearResultadoSinDatos("No se encontró el check-in de esta reservación; no es posible hacer check-out sin haber hecho check-in.");
  }

  const vehiculo = await vehiculosRepository.getById(reservacion.vehiculoId);
  if (!vehiculo) {
    return crearResultadoSinDatos("No se encontró información del vehículo asignado.");
  }

  const territorio = PARAMS_CONFIG.territorios[vehiculo.territorioId as keyof typeof PARAMS_CONFIG.territorios];

  return {
    solicitud,
    reservacion,
    vehiculo,
    checkIn,
    territorioNombre: territorio?.nombre ?? vehiculo.territorioId,
  };
}

export interface RegistrarCheckOutInput {
  reservacionId: string;
  usuarioId: string;
  kilometrajeFinal: number;
  combustibleRestante: number;
  fotos: string[];
  estadoVehiculo: EstadoVehiculoDevolucion;
  llavesDevueltas: boolean;
  danosDescripcion?: string;
  observaciones?: string;
}

export interface ResumenCheckOut {
  kilometrosRecorridos: number;
  duracionRealMinutos: number;
  retrasoMinutos: number;
  diferenciaCombustiblePorcentaje: number;
  fueraDeHorarioNoAutorizado: boolean;
  costoEstimado: number;
  costoReal: number;
  /** Estimado - real: positivo significa que el viaje costó menos de lo estimado (ahorro). */
  diferenciaCosto: number;
  emisionesEstimadasGramos: number;
  emisionesRealesGramos: number;
  incidenciasCreadasIds: string[];
}

export interface RegistroCheckOutExito {
  checkOut: CheckOut;
  resumen: ResumenCheckOut;
}

async function crearIncidenciaAutomatica(params: {
  reservacion: Reservacion;
  solicitud: Solicitud;
  usuarioId: string;
  tipoIncidencia: string;
  severidad: Incidencia["severidad"];
  descripcion: string;
  ahora: string;
}): Promise<Incidencia> {
  const incidencia: Incidencia = {
    id: crypto.randomUUID(),
    fechaCreacion: params.ahora,
    fechaActualizacion: params.ahora,
    usuarioCreadorId: params.usuarioId,
    estatus: "ACTIVO",
    reservacionId: params.reservacion.id,
    vehiculoId: params.reservacion.vehiculoId,
    usuarioReportaId: params.usuarioId,
    tipoIncidencia: params.tipoIncidencia,
    severidad: params.severidad,
    descripcion: params.descripcion,
    estadoIncidencia: "ABIERTA",
  };
  return incidenciasRepository.create(incidencia);
}

/**
 * Valida y registra el check-out: calcula las cifras reales del viaje
 * (servicioCostos/servicioEmisiones con km y duración reales), crea
 * Incidencias automáticas si hay daños reportados o uso fuera de horario no
 * autorizado, y cierra la reservación y la solicitud como "Completada".
 */
export async function registrarCheckOut(input: RegistrarCheckOutInput): Promise<RegistroCheckOutExito | ResultadoSinDatos> {
  const contexto = await obtenerContextoCheckOut(input.reservacionId);
  if (esResultadoSinDatos(contexto)) return contexto;
  const { solicitud, reservacion, vehiculo, checkIn } = contexto;

  const validacion = validarDatosCheckOut({
    kilometrajeFinal: input.kilometrajeFinal,
    kilometrajeInicial: checkIn.kilometrajeInicial,
    combustibleRestante: input.combustibleRestante,
    fotos: input.fotos,
    estadoVehiculo: input.estadoVehiculo,
    llavesDevueltas: input.llavesDevueltas,
    danosDescripcion: input.danosDescripcion,
  });
  if (!validacion.valido) {
    return crearResultadoSinDatos(validacion.errores.join(" "));
  }

  const ahora = new Date();
  const ahoraISO = ahora.toISOString();

  const kilometrosRecorridos = calcularKilometrosRecorridos(checkIn.kilometrajeInicial, input.kilometrajeFinal);
  const duracionRealMinutos = calcularDuracionRealMinutos(checkIn.fechaHoraCheckIn, ahoraISO);
  const retrasoMinutos = calcularRetrasoMinutos(reservacion.fechaFin, ahoraISO);
  const diferenciaCombustiblePorcentaje = calcularDiferenciaCombustiblePorcentaje(
    checkIn.combustibleInicial,
    input.combustibleRestante,
    kilometrosRecorridos
  );
  const fueraDeHorario = esUsoFueraDeHorario(checkIn.fechaHoraCheckIn, ahoraISO);
  const autorizado = estabaAutorizadoFueraDeHorario(solicitud.motivoAprobacionEspecial);
  const fueraDeHorarioNoAutorizado = fueraDeHorario && !autorizado;

  const tipoVehiculo = mapTipoVehiculo(vehiculo);
  const tipoCombustible = mapTipoCombustible(vehiculo.combustibleTipo);
  const modalidad: ModalidadFlota = vehiculo.modalidad === "POOL" ? "pool" : "asignado";

  const costoResultado = calcularCostoVehiculo({
    km: kilometrosRecorridos,
    tipoVehiculo,
    modalidad,
    duracionMinutos: duracionRealMinutos,
  });
  const rendimientoKmLitro = COSTOS_CONFIG.vehiculos[tipoVehiculo]?.rendimientoKmLitro ?? 0;
  const emisionesResultado = calcularEmisionesVehiculo({
    km: kilometrosRecorridos,
    tipoVehiculo,
    rendimientoKmLitro,
    tipoCombustible,
  });

  const incidenciasCreadasIds: string[] = [];

  if (input.estadoVehiculo === "CON_DANOS") {
    const incidencia = await crearIncidenciaAutomatica({
      reservacion,
      solicitud,
      usuarioId: input.usuarioId,
      tipoIncidencia: "DANOS_REPORTADOS",
      severidad: CHECKOUT_CONFIG.severidad.danosReportados,
      descripcion: `Daños reportados al devolver el vehículo del folio ${solicitud.folio}: ${input.danosDescripcion}`,
      ahora: ahoraISO,
    });
    incidenciasCreadasIds.push(incidencia.id);
  }

  if (fueraDeHorarioNoAutorizado) {
    const incidencia = await crearIncidenciaAutomatica({
      reservacion,
      solicitud,
      usuarioId: input.usuarioId,
      tipoIncidencia: "USO_FUERA_DE_HORARIO_NO_AUTORIZADO",
      severidad: CHECKOUT_CONFIG.severidad.usoFueraDeHorarioNoAutorizado,
      descripcion: `El viaje del folio ${solicitud.folio} se realizó fuera de horario laboral o en fin de semana sin estar autorizado en la aprobación original.`,
      ahora: ahoraISO,
    });
    incidenciasCreadasIds.push(incidencia.id);
  }

  const checkOut: CheckOut = {
    id: crypto.randomUUID(),
    fechaCreacion: ahoraISO,
    fechaActualizacion: ahoraISO,
    usuarioCreadorId: input.usuarioId,
    estatus: "ACTIVO",
    reservacionId: input.reservacionId,
    usuarioId: input.usuarioId,
    fechaHoraCheckOut: ahoraISO,
    kilometrajeFinal: input.kilometrajeFinal,
    combustibleRestante: input.combustibleRestante,
    fotos: input.fotos,
    estadoVehiculo: input.estadoVehiculo,
    llavesDevueltas: input.llavesDevueltas,
    danosDescripcion: input.danosDescripcion || undefined,
    kilometrosRecorridos,
    duracionRealMinutos,
    retrasoMinutos,
    diferenciaCombustiblePorcentaje,
    fueraDeHorarioNoAutorizado,
    costoReal: costoResultado.costoTotal,
    emisionesRealesGramos: emisionesResultado.totalGramosCo2,
    incidenciasCreadasIds,
    observaciones: input.observaciones || undefined,
  };
  await checkOutsRepository.create(checkOut);

  await reservacionesRepository.update(reservacion.id, {
    estadoReservacion: "COMPLETADA",
    costoReal: costoResultado.costoTotal,
    fechaActualizacion: ahoraISO,
  });
  await solicitudesRepository.update(solicitud.id, {
    estadoSolicitud: "COMPLETADA",
    fechaActualizacion: ahoraISO,
  });
  await vehiculosRepository.update(vehiculo.id, {
    kilometrajeActual: input.kilometrajeFinal,
    estadoOperativo: input.estadoVehiculo === "CON_DANOS" ? "EN_MANTENIMIENTO" : "DISPONIBLE",
    disponibilidadActual: input.estadoVehiculo !== "CON_DANOS",
    fechaActualizacion: ahoraISO,
  });

  await registrosAuditoriaRepository.create({
    id: crypto.randomUUID(),
    fechaCreacion: ahoraISO,
    fechaActualizacion: ahoraISO,
    usuarioCreadorId: input.usuarioId,
    estatus: "ACTIVO",
    entidad: "Reservacion",
    entidadId: reservacion.id,
    accion: "CHECK_OUT",
    usuarioId: input.usuarioId,
    cambiosJson: JSON.stringify({
      kilometrosRecorridos,
      costoReal: costoResultado.costoTotal,
      emisionesRealesGramos: emisionesResultado.totalGramosCo2,
      fueraDeHorarioNoAutorizado,
      incidenciasCreadasIds,
    }),
    fechaCambio: ahoraISO,
  });

  const resumen: ResumenCheckOut = {
    kilometrosRecorridos,
    duracionRealMinutos,
    retrasoMinutos,
    diferenciaCombustiblePorcentaje,
    fueraDeHorarioNoAutorizado,
    costoEstimado: solicitud.costoEstimado ?? 0,
    costoReal: costoResultado.costoTotal,
    diferenciaCosto: (solicitud.costoEstimado ?? 0) - costoResultado.costoTotal,
    emisionesEstimadasGramos: solicitud.emisionesEstimadasGramos ?? 0,
    emisionesRealesGramos: emisionesResultado.totalGramosCo2,
    incidenciasCreadasIds,
  };

  return { checkOut, resumen };
}
