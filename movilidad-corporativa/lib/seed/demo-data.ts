import type {
  Aprobacion,
  CheckIn,
  CheckOut,
  Costo,
  EscenarioBase,
  FactorEmision,
  Incidencia,
  Mantenimiento,
  MetaGerencial,
  Notificacion,
  RegistroAuditoria,
  Reservacion,
  Rol,
  Solicitud,
  Tarifa,
  Territorio,
  UbicacionGPS,
  Usuario,
  Vehiculo,
} from "@/lib/models";
import { format } from "date-fns";

const baseDate = new Date("2025-01-15T08:30:00");
const buildDateTime = (offsetDays: number, hour: string, minute = "30") => {
  const date = new Date(baseDate);
  date.setDate(baseDate.getDate() + offsetDays);
  const [hours, mins] = [Number(hour), Number(minute)];
  date.setHours(hours, mins, 0, 0);
  return format(date, "yyyy-MM-dd'T'HH:mm:ssXXX");
};

const createBaseEntity = (id: string, usuarioId: string, estatus: "ACTIVO" | "PENDIENTE" | "COMPLETADA" | "CANCELADA" = "ACTIVO") => ({
  id,
  fechaCreacion: buildDateTime(0, "08", "30"),
  fechaActualizacion: buildDateTime(0, "08", "30"),
  usuarioCreadorId: usuarioId,
  estatus,
  historialCambios: [{ id: `${id}-hist-1`, fecha: buildDateTime(0, "08", "30"), usuarioId, accion: "CREADO", detalle: "Registro inicial" }],
});

export const demoRoles: Rol[] = [
  {
    ...createBaseEntity("rol-colaborador", "user-admin"),
    nombreRol: "COLABORADOR",
    permisos: ["crear-solicitud", "ver-mis-reservaciones", "reportar-incidencias"],
  },
  {
    ...createBaseEntity("rol-aprobador", "user-admin"),
    nombreRol: "APROBADOR",
    permisos: ["aprobar-solicitudes", "asignar-vehiculos", "ver-fleet"],
  },
  {
    ...createBaseEntity("rol-admin-flota", "user-admin"),
    nombreRol: "ADMIN_FLOTA",
    permisos: ["gestionar-vehiculos", "gestionar-mantenimientos", "administrar-configuracion"],
  },
];

export const demoTerritorios: Territorio[] = [
  { ...createBaseEntity("territorio-cdmx", "user-admin"), nombreTerritorio: "CDMX", codigoTerritorio: "CDMX", responsableId: "user-2", region: "NORTE" },
  { ...createBaseEntity("territorio-guadalajara", "user-admin"), nombreTerritorio: "Guadalajara", codigoTerritorio: "GDL", responsableId: "user-3", region: "CENTRO" },
  { ...createBaseEntity("territorio-monterrey", "user-admin"), nombreTerritorio: "Monterrey", codigoTerritorio: "MTY", responsableId: "user-4", region: "NORTE" },
  { ...createBaseEntity("territorio-puebla", "user-admin"), nombreTerritorio: "Puebla", codigoTerritorio: "PUE", responsableId: "user-5", region: "CENTRO" },
  { ...createBaseEntity("territorio-queretaro", "user-admin"), nombreTerritorio: "Querétaro", codigoTerritorio: "QRO", responsableId: "user-6", region: "CENTRO" },
  { ...createBaseEntity("territorio-merida", "user-admin"), nombreTerritorio: "Mérida", codigoTerritorio: "MID", responsableId: "user-7", region: "SUR" },
];

export const demoUsuarios: Usuario[] = [
  { ...createBaseEntity("user-admin", "user-admin"), nombreCompleto: "María Torres", correoCorporativo: "maria.torres@banorte.com", empleadoId: "EMP-1000", rol: "ADMIN_FLOTA", territorioId: "territorio-cdmx", telefono: "5550000001" },
  { ...createBaseEntity("user-1", "user-admin"), nombreCompleto: "Ana López", correoCorporativo: "ana.lopez@banorte.com", empleadoId: "EMP-1001", rol: "COLABORADOR", territorioId: "territorio-cdmx", telefono: "5550000002" },
  { ...createBaseEntity("user-2", "user-admin"), nombreCompleto: "Luis Ramírez", correoCorporativo: "luis.ramirez@banorte.com", empleadoId: "EMP-1002", rol: "APROBADOR", territorioId: "territorio-cdmx", telefono: "5550000003" },
  { ...createBaseEntity("user-3", "user-admin"), nombreCompleto: "Sofía Méndez", correoCorporativo: "sofia.mendez@banorte.com", empleadoId: "EMP-1003", rol: "APROBADOR", territorioId: "territorio-guadalajara", telefono: "5550000004" },
  { ...createBaseEntity("user-4", "user-admin"), nombreCompleto: "Diego Ortega", correoCorporativo: "diego.ortega@banorte.com", empleadoId: "EMP-1004", rol: "COLABORADOR", territorioId: "territorio-monterrey", telefono: "5550000005" },
  { ...createBaseEntity("user-5", "user-admin"), nombreCompleto: "Patricia Vega", correoCorporativo: "patricia.vega@banorte.com", empleadoId: "EMP-1005", rol: "COLABORADOR", territorioId: "territorio-puebla", telefono: "5550000006" },
  { ...createBaseEntity("user-6", "user-admin"), nombreCompleto: "Eduardo Cruz", correoCorporativo: "eduardo.cruz@banorte.com", empleadoId: "EMP-1006", rol: "COLABORADOR", territorioId: "territorio-queretaro", telefono: "5550000007" },
  { ...createBaseEntity("user-7", "user-admin"), nombreCompleto: "Karina Solís", correoCorporativo: "karina.solis@banorte.com", empleadoId: "EMP-1007", rol: "COLABORADOR", territorioId: "territorio-merida", telefono: "5550000008" },
];

export const demoVehiculos: Vehiculo[] = [
  { ...createBaseEntity("veh-1", "user-admin"), placa: "ABC-123", marcaModelo: "Toyota Corolla", tipoVehiculo: "Sedán", modalidad: "POOL", territorioId: "territorio-cdmx", capacidadPasajeros: 4, combustibleTipo: "Gasolina", kilometrajeActual: 18250, rendimientoKmPorLitro: 14.8, estadoOperativo: "DISPONIBLE", disponibilidadActual: true, costoPorKm: 2.8, factorEmisionId: "factor-pool" },
  { ...createBaseEntity("veh-2", "user-admin"), placa: "DEF-456", marcaModelo: "Honda HR-V", tipoVehiculo: "SUV", modalidad: "ASIGNADO", territorioId: "territorio-guadalajara", capacidadPasajeros: 5, combustibleTipo: "Híbrido", kilometrajeActual: 22100, rendimientoKmPorLitro: 16.2, estadoOperativo: "OCUPADO", disponibilidadActual: false, costoPorKm: 3.2, factorEmisionId: "factor-asignado" },
  { ...createBaseEntity("veh-3", "user-admin"), placa: "GHI-789", marcaModelo: "Nissan Versa", tipoVehiculo: "Sedán", modalidad: "POOL", territorioId: "territorio-monterrey", capacidadPasajeros: 4, combustibleTipo: "Gasolina", kilometrajeActual: 31500, rendimientoKmPorLitro: 13.5, estadoOperativo: "EN_MANTENIMIENTO", disponibilidadActual: false, costoPorKm: 2.6, factorEmisionId: "factor-pool" },
  { ...createBaseEntity("veh-4", "user-admin"), placa: "JKL-012", marcaModelo: "Tesla Model 3", tipoVehiculo: "Eléctrico", modalidad: "UBER", territorioId: "territorio-puebla", capacidadPasajeros: 4, combustibleTipo: "Eléctrico", kilometrajeActual: 6400, rendimientoKmPorLitro: 0, estadoOperativo: "DISPONIBLE", disponibilidadActual: true, costoPorKm: 3.9, factorEmisionId: "factor-uber" },
  { ...createBaseEntity("veh-5", "user-admin"), placa: "MNO-345", marcaModelo: "Chevrolet Equinox", tipoVehiculo: "SUV", modalidad: "ASIGNADO", territorioId: "territorio-queretaro", capacidadPasajeros: 5, combustibleTipo: "Diesel", kilometrajeActual: 27800, rendimientoKmPorLitro: 12.4, estadoOperativo: "DISPONIBLE", disponibilidadActual: true, costoPorKm: 3.1, factorEmisionId: "factor-asignado" },
  { ...createBaseEntity("veh-6", "user-admin"), placa: "PQR-678", marcaModelo: "Kia Rio", tipoVehiculo: "Sedán", modalidad: "POOL", territorioId: "territorio-merida", capacidadPasajeros: 4, combustibleTipo: "Gasolina", kilometrajeActual: 19230, rendimientoKmPorLitro: 14.1, estadoOperativo: "DISPONIBLE", disponibilidadActual: true, costoPorKm: 2.7, factorEmisionId: "factor-pool" },
];

export const demoSolicitudes: Solicitud[] = [
  { ...createBaseEntity("sol-1", "user-1", "COMPLETADA"), usuarioSolicitanteId: "user-1", territorioId: "territorio-cdmx", fechaSolicitud: "2025-01-15", horaInicioDeseada: "08:30", horaFinDeseada: "18:00", origen: "Torre Banorte", destino: "Centro de Convenciones", motivoViaje: "Visita comercial", tipoViaje: "Corporativo", modalidadRequerida: "POOL", estadoSolicitud: "COMPLETADA", prioridad: "ALTA" },
  { ...createBaseEntity("sol-2", "user-4", "PENDIENTE"), usuarioSolicitanteId: "user-4", territorioId: "territorio-monterrey", fechaSolicitud: "2025-01-16", horaInicioDeseada: "07:30", horaFinDeseada: "16:00", origen: "Sucursal Monterrey", destino: "Aeropuerto", motivoViaje: "Reunión ejecutiva", tipoViaje: "Corporativo", modalidadRequerida: "ASIGNADO", estadoSolicitud: "PENDIENTE_APROBACION", prioridad: "ALTA" },
  { ...createBaseEntity("sol-3", "user-5", "ACTIVO"), usuarioSolicitanteId: "user-5", territorioId: "territorio-puebla", fechaSolicitud: "2025-01-17", horaInicioDeseada: "09:00", horaFinDeseada: "17:30", origen: "Oficinas Puebla", destino: "Planta logística", motivoViaje: "Visita de operaciones", tipoViaje: "Operativo", modalidadRequerida: "POOL", estadoSolicitud: "APROBADA", prioridad: "MEDIA" },
  { ...createBaseEntity("sol-4", "user-6", "ACTIVO"), usuarioSolicitanteId: "user-6", territorioId: "territorio-queretaro", fechaSolicitud: "2025-01-18", horaInicioDeseada: "10:00", horaFinDeseada: "15:00", origen: "Oficinas Querétaro", destino: "Centro comercial", motivoViaje: "Entrega de documentos", tipoViaje: "Corporativo", modalidadRequerida: "UBER", estadoSolicitud: "EN_CURSO", prioridad: "BAJA" },
];

export const demoReservaciones: Reservacion[] = [
  { ...createBaseEntity("res-1", "user-2", "COMPLETADA"), solicitudId: "sol-1", vehiculoId: "veh-1", modalidadAsignada: "POOL", fechaInicio: "2025-01-15T08:30:00-06:00", fechaFin: "2025-01-15T18:00:00-06:00", costoEstimado: 320, costoReal: 290, estadoReservacion: "COMPLETADA" },
  { ...createBaseEntity("res-2", "user-2", "ACTIVO"), solicitudId: "sol-2", vehiculoId: "veh-2", modalidadAsignada: "ASIGNADO", fechaInicio: "2025-01-16T07:30:00-06:00", fechaFin: "2025-01-16T16:00:00-06:00", costoEstimado: 420, costoReal: 0, estadoReservacion: "ASIGNADA" },
  { ...createBaseEntity("res-3", "user-2", "ACTIVO"), solicitudId: "sol-3", vehiculoId: "veh-6", modalidadAsignada: "POOL", fechaInicio: "2025-01-17T09:00:00-06:00", fechaFin: "2025-01-17T17:30:00-06:00", costoEstimado: 280, costoReal: 0, estadoReservacion: "EN_CURSO" },
];

export const demoAprobaciones: Aprobacion[] = [
  { ...createBaseEntity("apr-1", "user-2", "COMPLETADA"), solicitudId: "sol-2", aprobadorId: "user-2", decision: "APROBADA", comentario: "Aprobado por cumplimiento de agenda", reglaAplicada: "Horario laboral", fechaDecision: "2025-01-16T07:00:00-06:00" },
  { ...createBaseEntity("apr-2", "user-2", "ACTIVO"), solicitudId: "sol-3", aprobadorId: "user-2", decision: "PENDIENTE", comentario: "Pendiente de revisión", reglaAplicada: "Prioridad de operación", fechaDecision: "2025-01-17T08:30:00-06:00" },
];

export const demoCheckIns: CheckIn[] = [
  { ...createBaseEntity("checkin-1", "user-1", "COMPLETADA"), reservacionId: "res-1", usuarioId: "user-1", fechaHoraCheckIn: "2025-01-15T08:30:00-06:00", ubicacion: "Torre Banorte", observaciones: "Ingreso normal" },
];
export const demoCheckOuts: CheckOut[] = [
  { ...createBaseEntity("checkout-1", "user-1", "COMPLETADA"), reservacionId: "res-1", usuarioId: "user-1", fechaHoraCheckOut: "2025-01-15T18:00:00-06:00", kilometrajeFinal: 18450, combustibleRestante: 45, observaciones: "Fin de servicio" },
];
export const demoIncidencias: Incidencia[] = [
  { ...createBaseEntity("inc-1", "user-1", "ACTIVO"), reservacionId: "res-2", vehiculoId: "veh-2", usuarioReportaId: "user-4", tipoIncidencia: "FALLA_MECANICA", severidad: "ALTA", descripcion: "El vehículo presentó un problema en el sistema de frenos", estadoIncidencia: "ABIERTA" },
];
export const demoMantenimientos: Mantenimiento[] = [
  { ...createBaseEntity("mant-1", "user-admin", "ACTIVO"), vehiculoId: "veh-3", tipoMantenimiento: "REVISION_GENERAL", fechaProgramada: "2025-01-20", fechaRealizada: "2025-01-19", costo: 4800, responsable: "Taller Banorte" },
];
export const demoUbicacionesGPS: UbicacionGPS[] = [
  { ...createBaseEntity("gps-1", "user-admin", "ACTIVO"), vehiculoId: "veh-1", latitud: 19.4326, longitud: -99.1332, timestampLectura: "2025-01-15T08:35:00-06:00", velocidad: 48, estadoVehiculo: "EN_RUTA" },
];
export const demoTarifas: Tarifa[] = [
  { ...createBaseEntity("tar-1", "user-admin", "ACTIVO"), nombreTarifa: "Pool corporativo", modalidad: "POOL", costoBase: 120, costoPorKm: 2.8, costoPorHora: 36, vigenciaInicio: "2025-01-01", vigenciaFin: "2025-12-31" },
  { ...createBaseEntity("tar-2", "user-admin", "ACTIVO"), nombreTarifa: "Asignado premium", modalidad: "ASIGNADO", costoBase: 180, costoPorKm: 3.2, costoPorHora: 48, vigenciaInicio: "2025-01-01", vigenciaFin: "2025-12-31" },
  { ...createBaseEntity("tar-3", "user-admin", "ACTIVO"), nombreTarifa: "Uber ejecutivo", modalidad: "UBER", costoBase: 220, costoPorKm: 3.9, costoPorHora: 60, vigenciaInicio: "2025-01-01", vigenciaFin: "2025-12-31" },
];
export const demoCostos: Costo[] = [
  { ...createBaseEntity("costo-1", "user-admin", "ACTIVO"), reservacionId: "res-1", tarifaId: "tar-1", concepto: "Combustible y peaje", monto: 290, moneda: "MXN", fechaAplicacion: "2025-01-15" },
];
export const demoFactoresEmision: FactorEmision[] = [
  { ...createBaseEntity("factor-pool", "user-admin", "ACTIVO"), modalidad: "POOL", tipoCombustible: "Gasolina", tipoVehiculo: "Sedán", unidad: "kgCO2/km", factor: 0.18, fuente: "Secretaría de Medio Ambiente", vigenciaInicio: "2025-01-01", vigenciaFin: "2025-12-31" },
  { ...createBaseEntity("factor-asignado", "user-admin", "ACTIVO"), modalidad: "ASIGNADO", tipoCombustible: "Híbrido", tipoVehiculo: "SUV", unidad: "kgCO2/km", factor: 0.14, fuente: "Secretaría de Medio Ambiente", vigenciaInicio: "2025-01-01", vigenciaFin: "2025-12-31" },
  { ...createBaseEntity("factor-uber", "user-admin", "ACTIVO"), modalidad: "UBER", tipoCombustible: "Eléctrico", tipoVehiculo: "Eléctrico", unidad: "kgCO2/km", factor: 0.08, fuente: "Secretaría de Medio Ambiente", vigenciaInicio: "2025-01-01", vigenciaFin: "2025-12-31" },
];
export const demoEscenariosBase: EscenarioBase[] = [
  { ...createBaseEntity("esc-1", "user-admin", "ACTIVO"), descripcion: "Escenario base 2025", periodo: "2025-01", costoBaseEstimado: 128500, emisionesBaseEstimadas: 2845, configuracion: "Sin cambios" },
];
export const demoMetasGerenciales: MetaGerencial[] = [
  { ...createBaseEntity("meta-1", "user-admin", "ACTIVO"), territorioId: "territorio-cdmx", tipoMeta: "REDUCCION_EMISIONES", valorObjetivo: 10, periodo: "2025-01" },
  { ...createBaseEntity("meta-2", "user-admin", "ACTIVO"), territorioId: "territorio-guadalajara", tipoMeta: "REDUCCION_COSTOS", valorObjetivo: 8, periodo: "2025-01" },
];
export const demoNotificaciones: Notificacion[] = [
  { ...createBaseEntity("notif-1", "user-1", "ACTIVO"), usuarioDestinoId: "user-1", solicitudId: "sol-2", tipoNotificacion: "APROBACION", mensaje: "Se requiere aprobación de tu solicitud", leida: false, canal: "EMAIL" },
];
export const demoRegistrosAuditoria: RegistroAuditoria[] = [
  { ...createBaseEntity("audit-1", "user-admin", "ACTIVO"), entidad: "Solicitud", entidadId: "sol-1", accion: "CREAR", usuarioId: "user-1", cambiosJson: "{\"estado\": \"BORRADOR\"}", fechaCambio: "2025-01-15T08:30:00-06:00" },
];
