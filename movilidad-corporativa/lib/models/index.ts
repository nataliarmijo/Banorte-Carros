export type RolNombre =
  | "COLABORADOR"
  | "APROBADOR"
  | "ADMIN_FLOTA"
  | "EJECUTIVO";

export type ModalidadVehiculo = "POOL" | "ASIGNADO" | "UBER";
export type EstatusEntidad =
  | "ACTIVO"
  | "INACTIVO"
  | "BORRADOR"
  | "PENDIENTE"
  | "APROBADA"
  | "RECHAZADA"
  | "ASIGNADA"
  | "EN_CURSO"
  | "COMPLETADA"
  | "CANCELADA"
  | "RESUELTA"
  | "ABIERTA"
  | "EN_PROCESO";
export type EstadoSolicitud =
  | "BORRADOR"
  | "PENDIENTE_APROBACION"
  | "APROBADA"
  | "RECHAZADA"
  | "ASIGNADA"
  | "LISTA_CHECK_IN"
  | "EN_CURSO"
  | "COMPLETADA"
  | "CANCELADA";
export type EstadoIncidencia = "ABIERTA" | "EN_PROCESO" | "RESUELTA" | "CRITICA";
export type NivelPrioridad = "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
export type DecisionAprobacion = "PENDIENTE" | "APROBADA" | "RECHAZADA";

export interface HistorialCambio {
  id: string;
  fecha: string;
  usuarioId: string;
  accion: string;
  detalle: string;
}

export interface BaseEntity {
  id: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  usuarioCreadorId: string;
  estatus: EstatusEntidad;
  historialCambios?: HistorialCambio[];
}

export interface Usuario extends BaseEntity {
  nombreCompleto: string;
  correoCorporativo: string;
  empleadoId: string;
  rol: RolNombre;
  territorioId: string;
  telefono?: string;
}

export interface Rol extends BaseEntity {
  nombreRol: RolNombre;
  permisos: string[];
}

export interface Territorio extends BaseEntity {
  nombreTerritorio: string;
  codigoTerritorio: string;
  responsableId: string;
  region: string;
}

export interface Vehiculo extends BaseEntity {
  placa: string;
  marcaModelo: string;
  tipoVehiculo: string;
  modalidad: ModalidadVehiculo;
  territorioId: string;
  capacidadPasajeros: number;
  combustibleTipo: string;
  kilometrajeActual: number;
  rendimientoKmPorLitro: number;
  estadoOperativo: "DISPONIBLE" | "OCUPADO" | "EN_MANTENIMIENTO" | "FUERA_DE_SERVICIO";
  disponibilidadActual: boolean;
  costoPorKm: number;
  factorEmisionId: string;
}

export interface Solicitud extends BaseEntity {
  usuarioSolicitanteId: string;
  territorioId: string;
  fechaSolicitud: string;
  horaInicioDeseada: string;
  horaFinDeseada: string;
  origen: string;
  destino: string;
  motivoViaje: string;
  tipoViaje: string;
  modalidadRequerida: ModalidadVehiculo;
  estadoSolicitud: EstadoSolicitud;
  prioridad: NivelPrioridad;
}

export interface Reservacion extends BaseEntity {
  solicitudId: string;
  vehiculoId: string;
  modalidadAsignada: ModalidadVehiculo;
  fechaInicio: string;
  fechaFin: string;
  costoEstimado: number;
  costoReal: number;
  estadoReservacion: EstadoSolicitud;
}

export interface Aprobacion extends BaseEntity {
  solicitudId: string;
  aprobadorId: string;
  decision: DecisionAprobacion;
  comentario?: string;
  reglaAplicada: string;
  fechaDecision: string;
}

export interface CheckIn extends BaseEntity {
  reservacionId: string;
  usuarioId: string;
  fechaHoraCheckIn: string;
  ubicacion: string;
  observaciones?: string;
}

export interface CheckOut extends BaseEntity {
  reservacionId: string;
  usuarioId: string;
  fechaHoraCheckOut: string;
  kilometrajeFinal: number;
  combustibleRestante: number;
  observaciones?: string;
}

export interface Incidencia extends BaseEntity {
  reservacionId: string;
  vehiculoId: string;
  usuarioReportaId: string;
  tipoIncidencia: string;
  severidad: NivelPrioridad;
  descripcion: string;
  evidenciaUrl?: string;
  estadoIncidencia: EstadoIncidencia;
}

export interface Mantenimiento extends BaseEntity {
  vehiculoId: string;
  tipoMantenimiento: string;
  fechaProgramada: string;
  fechaRealizada?: string;
  costo: number;
  responsable: string;
}

export interface UbicacionGPS extends BaseEntity {
  vehiculoId: string;
  latitud: number;
  longitud: number;
  timestampLectura: string;
  velocidad: number;
  estadoVehiculo: string;
}

export interface Tarifa extends BaseEntity {
  nombreTarifa: string;
  modalidad: ModalidadVehiculo;
  costoBase: number;
  costoPorKm: number;
  costoPorHora: number;
  vigenciaInicio: string;
  vigenciaFin: string;
}

export interface Costo extends BaseEntity {
  reservacionId: string;
  tarifaId: string;
  concepto: string;
  monto: number;
  moneda: string;
  fechaAplicacion: string;
}

export interface FactorEmision extends BaseEntity {
  modalidad: ModalidadVehiculo;
  tipoCombustible: string;
  tipoVehiculo: string;
  unidad: string;
  factor: number;
  fuente: string;
  vigenciaInicio: string;
  vigenciaFin: string;
}

export interface EscenarioBase extends BaseEntity {
  descripcion: string;
  periodo: string;
  costoBaseEstimado: number;
  emisionesBaseEstimadas: number;
  configuracion: string;
}

export interface MetaGerencial extends BaseEntity {
  territorioId: string;
  tipoMeta: string;
  valorObjetivo: number;
  periodo: string;
}

export interface Notificacion extends BaseEntity {
  usuarioDestinoId: string;
  solicitudId: string;
  tipoNotificacion: string;
  mensaje: string;
  leida: boolean;
  canal: string;
}

export interface RegistroAuditoria extends BaseEntity {
  entidad: string;
  entidadId: string;
  accion: string;
  usuarioId: string;
  cambiosJson: string;
  fechaCambio: string;
}
