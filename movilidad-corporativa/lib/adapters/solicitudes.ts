/**
 * Adaptador que orquesta la creación de una Solicitud a partir del wizard:
 * genera el folio, decide si requiere aprobación especial (Chunk 4) y, si
 * no la requiere, ejecuta el motor de asignación (Chunk 5) para reservar una
 * unidad real o registrar el viaje en Uber.
 */

import { db } from "@/lib/repositories/dexie";
import {
  aprobacionesRepository,
  reservacionesRepository,
  solicitudesRepository,
} from "@/lib/repositories/typed-repositories";
import type { Aprobacion, Reservacion, Solicitud } from "@/lib/models";
import { evaluarAprobacionEspecial } from "@/lib/services/servicio-comparador";
import { esResultadoSinDatos } from "@/lib/services/types";
import type { Alternativa, BorradorSolicitud, ResultadoComparacion, TipoVehiculo } from "@/lib/services/types";
import type { SolicitudAsignacion } from "@/lib/services/servicioAsignacion";
import { asignarVehiculoDeFlota } from "@/lib/adapters/flota";
import { proveedorUber, type ConfirmacionViajeUber } from "@/lib/integraciones/uber";
import { notificarSolicitudCreada, notificarVehiculoAsignado } from "@/lib/adapters/notificaciones";

export interface DatosViajeValidados {
  territorio: string;
  origen: string;
  destino: string;
  fechaSalida: string;
  horaSalida: string;
  fechaRegreso: string;
  horaRegreso: string;
  distanciaEstimadaKm: number;
  pasajeros: number;
  motivoViaje: string;
  tipoVehiculoRequerido: TipoVehiculo;
  necesidadesEspeciales?: string;
  transportaEquipo: boolean;
}

export interface DatosParaEnviarSolicitud {
  datos: DatosViajeValidados;
  fechaSalida: Date;
  fechaRegreso: Date;
  duracionEstimadaMinutos: number;
  alternativaSeleccionada: Alternativa;
  resultado: ResultadoComparacion;
  usuarioSolicitanteId: string;
  limiteCostoAprobacion: number;
}

export interface EnvioSolicitudExito {
  folio: string;
  solicitudId: string;
  estado: "ASIGNADA" | "PENDIENTE_APROBACION";
  vehiculoAsignadoNombre?: string;
  /** Presente sólo cuando la alternativa elegida es Uber; siempre `esSimulado: true` (ver /lib/integraciones/uber.ts). */
  confirmacionUber?: ConfirmacionViajeUber;
}

export function generarFolio(secuencial: number, fecha: Date = new Date()): string {
  return `MOV-${fecha.getFullYear()}-${String(secuencial).padStart(6, "0")}`;
}

async function buscarAprobadorDeTerritorio(territorioId: string) {
  const aprobadores = await db.usuarios.where("territorioId").equals(territorioId).toArray();
  return aprobadores.find((u) => u.rol === "APROBADOR") ?? aprobadores.find((u) => u.rol === "ADMIN_FLOTA");
}

export async function crearSolicitudDesdeWizard(
  entrada: DatosParaEnviarSolicitud
): Promise<EnvioSolicitudExito> {
  const { datos, fechaSalida, fechaRegreso, duracionEstimadaMinutos, alternativaSeleccionada, resultado, usuarioSolicitanteId } =
    entrada;

  const alternativaElegida = resultado.alternativas.find((a) => a.tipo === alternativaSeleccionada);
  const costoElegido = alternativaElegida?.costo.costoTotal ?? 0;
  const emisionesElegidas = alternativaElegida?.emisiones.totalGramosCo2 ?? 0;

  const borrador: BorradorSolicitud = {
    territorioOrigen: datos.territorio,
    territorioDestino: datos.territorio,
    distanciaEstimadaKm: datos.distanciaEstimadaKm,
    fecha: fechaSalida,
    horaEstimada: fechaSalida.getHours(),
    pasajeros: datos.pasajeros,
    tipoVehiculoRequerido: datos.tipoVehiculoRequerido,
    duracionEstimadaMinutos,
  };
  const { requiereAprobacionEspecial, motivoAprobacionEspecial } = evaluarAprobacionEspecial(
    borrador,
    costoElegido,
    entrada.limiteCostoAprobacion
  );

  const secuencial = (await solicitudesRepository.list()).length + 1;
  const folio = generarFolio(secuencial);
  const ahora = new Date().toISOString();
  const solicitudId = crypto.randomUUID();

  const solicitud: Solicitud = {
    id: solicitudId,
    folio,
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioSolicitanteId,
    estatus: "ACTIVO",
    usuarioSolicitanteId,
    territorioId: datos.territorio,
    fechaSolicitud: datos.fechaSalida,
    horaInicioDeseada: datos.horaSalida,
    horaFinDeseada: datos.horaRegreso,
    fechaRegreso: datos.fechaRegreso,
    origen: datos.origen,
    destino: datos.destino,
    distanciaEstimadaKm: datos.distanciaEstimadaKm,
    duracionEstimadaMinutos,
    pasajeros: datos.pasajeros,
    tipoVehiculoRequerido: datos.tipoVehiculoRequerido,
    necesidadesEspeciales: datos.necesidadesEspeciales || undefined,
    transportaEquipo: datos.transportaEquipo,
    motivoViaje: datos.motivoViaje,
    tipoViaje: "Corporativo",
    modalidadRequerida: alternativaSeleccionada,
    costoEstimado: costoElegido,
    emisionesEstimadasGramos: emisionesElegidas,
    requiereAprobacionEspecial,
    motivoAprobacionEspecial,
    estadoSolicitud: requiereAprobacionEspecial ? "PENDIENTE_APROBACION" : "ASIGNADA",
    prioridad: "MEDIA",
  };

  await solicitudesRepository.create(solicitud);

  if (requiereAprobacionEspecial) {
    const aprobador = await buscarAprobadorDeTerritorio(datos.territorio);
    if (aprobador) {
      const aprobacion: Aprobacion = {
        id: crypto.randomUUID(),
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
        usuarioCreadorId: usuarioSolicitanteId,
        estatus: "ACTIVO",
        solicitudId,
        aprobadorId: aprobador.id,
        decision: "PENDIENTE",
        reglaAplicada: motivoAprobacionEspecial ?? "Aprobación especial",
        fechaDecision: ahora,
      };
      await aprobacionesRepository.create(aprobacion);
      await notificarSolicitudCreada(aprobador.id, folio, solicitudId);
    }
    return { folio, solicitudId, estado: "PENDIENTE_APROBACION" };
  }

  let vehiculoId: string;
  let vehiculoAsignadoNombre: string | undefined;
  let confirmacionUber: ConfirmacionViajeUber | undefined;

  if (alternativaSeleccionada === "UBER") {
    vehiculoId = `uber-${folio}`;
    vehiculoAsignadoNombre = "Uber (servicio externo)";
    confirmacionUber = await proveedorUber.solicitarViaje({
      km: datos.distanciaEstimadaKm,
      duracionMinutos: duracionEstimadaMinutos,
      origen: datos.origen,
      destino: datos.destino,
      pasajero: usuarioSolicitanteId,
    });
  } else {
    const solicitudAsignacion: SolicitudAsignacion = {
      territorio: datos.territorio,
      origen: datos.territorio,
      fechaSalida,
      fechaRegreso,
      tipoVehiculoRequerido: datos.tipoVehiculoRequerido,
      pasajeros: datos.pasajeros,
    };
    const resultadoAsignacion = await asignarVehiculoDeFlota(
      datos.territorio,
      alternativaSeleccionada,
      solicitudAsignacion
    );

    if (esResultadoSinDatos(resultadoAsignacion)) {
      await solicitudesRepository.update(solicitudId, {
        estadoSolicitud: "PENDIENTE_APROBACION",
        motivoAprobacionEspecial: `No se pudo asignar automáticamente una unidad: ${resultadoAsignacion.detalle}`,
      });
      return { folio, solicitudId, estado: "PENDIENTE_APROBACION" };
    }

    vehiculoId = resultadoAsignacion.recomendado.vehiculo.id;
    vehiculoAsignadoNombre = resultadoAsignacion.recomendado.vehiculo.nombre;
  }

  const reservacion: Reservacion = {
    id: crypto.randomUUID(),
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    usuarioCreadorId: usuarioSolicitanteId,
    estatus: "ACTIVO",
    solicitudId,
    vehiculoId,
    modalidadAsignada: alternativaSeleccionada,
    fechaInicio: fechaSalida.toISOString(),
    fechaFin: fechaRegreso.toISOString(),
    costoEstimado: costoElegido,
    costoReal: 0,
    estadoReservacion: "ASIGNADA",
  };
  await reservacionesRepository.create(reservacion);

  if (alternativaSeleccionada !== "UBER" && vehiculoAsignadoNombre) {
    await notificarVehiculoAsignado(usuarioSolicitanteId, folio, solicitudId, vehiculoAsignadoNombre);
  }

  return { folio, solicitudId, estado: "ASIGNADA", vehiculoAsignadoNombre, confirmacionUber };
}
