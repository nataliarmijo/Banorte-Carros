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
export type EstadoIncidencia = "ABIERTA" | "EN_PROCESO" | "RESUELTA" | "CERRADA";
export type TipoIncidencia =
  | "DANOS"
  | "ACCIDENTE"
  | "RETRASO"
  | "DIFERENCIA_COMBUSTIBLE"
  | "USO_FUERA_DE_HORARIO"
  | "FIN_DE_SEMANA_NO_AUTORIZADO"
  | "DESVIACION_RUTA"
  | "DOCUMENTACION_VENCIDA"
  | "MANTENIMIENTO_VENCIDO";
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
  /** Área o departamento del colaborador; usado como dimensión de filtro en /analitica. */
  area?: string;
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
  marca: string;
  modelo: string;
  anio: number;
  tipoVehiculo: string;
  modalidad: ModalidadVehiculo;
  territorioId: string;
  /** Ubicación física específica dentro del territorio (depósito, estacionamiento, taller). */
  ubicacion: string;
  capacidadPasajeros: number;
  combustibleTipo: string;
  kilometrajeActual: number;
  rendimientoKmPorLitro: number;
  estadoOperativo: "DISPONIBLE" | "OCUPADO" | "EN_MANTENIMIENTO" | "FUERA_DE_SERVICIO";
  disponibilidadActual: boolean;
  costoPorKm: number;
  factorEmisionId: string;
  /** Colaborador titular del vehículo; solo aplica cuando modalidad es "ASIGNADO". */
  usuarioAsignadoId?: string;
  /** Próxima fecha de verificación vehicular o vencimiento de seguro. */
  proximaVerificacionFecha?: string;
}

export interface Solicitud extends BaseEntity {
  folio: string;
  usuarioSolicitanteId: string;
  territorioId: string;
  fechaSolicitud: string;
  horaInicioDeseada: string;
  horaFinDeseada: string;
  fechaRegreso?: string;
  origen: string;
  destino: string;
  distanciaEstimadaKm?: number;
  duracionEstimadaMinutos?: number;
  pasajeros?: number;
  tipoVehiculoRequerido?: string;
  necesidadesEspeciales?: string;
  transportaEquipo?: boolean;
  motivoViaje: string;
  tipoViaje: string;
  modalidadRequerida: ModalidadVehiculo;
  costoEstimado?: number;
  emisionesEstimadasGramos?: number;
  requiereAprobacionEspecial?: boolean;
  motivoAprobacionEspecial?: string;
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
  kilometrajeInicial: number;
  combustibleInicial: number; // porcentaje 0-100
  /** Referencias simuladas (data URLs) de las fotografías del vehículo; almacenamiento simulado, no sube a un servidor. */
  fotos: string[];
  /** Firma electrónica simulada (data URL del trazo capturado en el canvas de firma). */
  firmaElectronica: string;
  responsivaAceptada: boolean;
  observaciones?: string;
}

export type EstadoVehiculoDevolucion = "BUENO" | "CON_OBSERVACIONES" | "CON_DANOS";

export interface CheckOut extends BaseEntity {
  reservacionId: string;
  usuarioId: string;
  fechaHoraCheckOut: string;
  kilometrajeFinal: number;
  combustibleRestante: number;
  /** Referencias simuladas (data URLs) de las fotografías del vehículo al devolverlo; almacenamiento simulado. */
  fotos: string[];
  estadoVehiculo: EstadoVehiculoDevolucion;
  llavesDevueltas: boolean;
  /** Descripción de daños; obligatoria cuando estadoVehiculo es "CON_DANOS". */
  danosDescripcion?: string;
  kilometrosRecorridos: number;
  duracionRealMinutos: number;
  /** Minutos de retraso frente a la hora de regreso planeada (0 si no hubo retraso). */
  retrasoMinutos: number;
  /** Diferencia (puntos porcentuales de tanque) entre el combustible consumido real y el esperado; positivo = consumió más de lo esperado. */
  diferenciaCombustiblePorcentaje: number;
  /** El uso ocurrió fuera de horario laboral o en fin de semana sin que la aprobación original lo autorizara. */
  fueraDeHorarioNoAutorizado: boolean;
  /** Costo real estimado del viaje (servicioCostos, con km/duración reales). */
  costoReal: number;
  /** Emisiones reales estimadas (servicioEmisiones, con km reales). */
  emisionesRealesGramos: number;
  /** Incidencias creadas automáticamente a partir de este check-out (daños y/o uso fuera de horario no autorizado). */
  incidenciasCreadasIds: string[];
  observaciones?: string;
}

export interface EntradaBitacora {
  id: string;
  fecha: string;
  usuarioId: string;
  comentario: string;
}

export interface Incidencia extends BaseEntity {
  /** Reservación relacionada, si aplica (p. ej. documentación/mantenimiento vencidos no están ligados a un viaje puntual). */
  reservacionId?: string;
  vehiculoId: string;
  usuarioReportaId: string;
  tipoIncidencia: TipoIncidencia;
  severidad: NivelPrioridad;
  descripcion: string;
  /** Referencias simuladas (data URLs) de evidencia fotográfica; almacenamiento simulado. */
  fotos: string[];
  responsableId?: string;
  fechaCompromiso?: string;
  bitacora: EntradaBitacora[];
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
