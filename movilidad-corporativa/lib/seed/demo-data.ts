import type { Aprobacion, CheckIn, CheckOut, Costo, EscenarioBase, FactorEmision, HistorialAuditoria, Incidencia, Mantenimiento, MetaGerencial, Notificacion, Reservacion, Rol, Solicitud, Tarifa, Territorio, UbicacionGPS, Usuario, Vehiculo } from "@/lib/models";
import { format } from "date-fns";

const now = new Date();
const createdAt = format(now, "yyyy-MM-dd'T'HH:mm:ssXXX");

export const demoRoles: Rol[] = [
  {
    id: "rol-colaborador",
    nombreRol: "COLABORADOR",
    permisos: ["crear-solicitud", "ver-mis-reservaciones", "reportar-incidencias"],
    createdAt,
    updatedAt: createdAt,
    createdBy: "seed",
    status: "ACTIVO",
  },
];

export const demoTerritorios: Territorio[] = [
  {
    id: "territorio-cdmx",
    nombreTerritorio: "CDMX",
    codigoTerritorio: "CDMX",
    responsableId: "user-1",
    createdAt,
    updatedAt: createdAt,
    createdBy: "seed",
    status: "ACTIVO",
  },
];

export const demoUsuarios: Usuario[] = [
  {
    id: "user-1",
    nombreCompleto: "Ana López",
    correoCorporativo: "ana.lopez@banorte.com",
    empleadoId: "EMP-1001",
    rol: "COLABORADOR",
    territorioId: "territorio-cdmx",
    telefono: "5550000000",
    createdAt,
    updatedAt: createdAt,
    createdBy: "seed",
    status: "ACTIVO",
  },
];

export const demoVehiculos: Vehiculo[] = [
  {
    id: "veh-1",
    placa: "ABC-123",
    marcaModelo: "Toyota Corolla",
    tipoVehiculo: "Sedán",
    modalidad: "POOL",
    territorioId: "territorio-cdmx",
    capacidadPasajeros: 4,
    combustibleTipo: "Gasolina",
    kilometrajeActual: 18000,
    estadoOperativo: "DISPONIBLE",
    disponibilidadActual: true,
    costoPorKm: 2.8,
    factorEmisionId: "factor-pool",
    createdAt,
    updatedAt: createdAt,
    createdBy: "seed",
    status: "ACTIVO",
  },
];

export const demoSolicitudes: Solicitud[] = [
  {
    id: "sol-1",
    usuarioSolicitanteId: "user-1",
    territorioId: "territorio-cdmx",
    fechaSolicitud: format(now, "yyyy-MM-dd"),
    horaInicioDeseada: "08:30",
    horaFinDeseada: "18:00",
    origen: "Torre Banorte",
    destino: "Centro de Convenciones",
    motivoViaje: "Visita comercial",
    tipoViaje: "Corporativo",
    modalidadRequerida: "POOL",
    estadoSolicitud: "EN_REVISION",
    prioridad: "ALTA",
    createdAt,
    updatedAt: createdAt,
    createdBy: "seed",
    status: "ACTIVO",
  },
];

export const demoReservaciones: Reservacion[] = [
  {
    id: "res-1",
    solicitudId: "sol-1",
    vehiculoId: "veh-1",
    modalidadAsignada: "POOL",
    fechaInicio: format(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    fechaFin: format(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    costoEstimado: 320,
    costoReal: 290,
    estadoReservacion: "ASIGNADA",
    createdAt,
    updatedAt: createdAt,
    createdBy: "seed",
    status: "ACTIVO",
  },
];

export const demoAprobaciones: Aprobacion[] = [
  {
    id: "apr-1",
    solicitudId: "sol-1",
    aprobadorId: "user-1",
    decision: "PENDIENTE",
    comentario: "Pendiente de revisión",
    reglaAplicada: "Horario laboral",
    fechaDecision: format(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    createdAt,
    updatedAt: createdAt,
    createdBy: "seed",
    status: "ACTIVO",
  },
];

export const demoCheckIns: CheckIn[] = [];
export const demoCheckOuts: CheckOut[] = [];
export const demoIncidencias: Incidencia[] = [];
export const demoMantenimientos: Mantenimiento[] = [];
export const demoUbicacionesGPS: UbicacionGPS[] = [];
export const demoTarifas: Tarifa[] = [];
export const demoCostos: Costo[] = [];
export const demoFactoresEmision: FactorEmision[] = [];
export const demoEscenariosBase: EscenarioBase[] = [];
export const demoMetasGerenciales: MetaGerencial[] = [];
export const demoNotificaciones: Notificacion[] = [];
export const demoHistorialAuditoria: HistorialAuditoria[] = [];
