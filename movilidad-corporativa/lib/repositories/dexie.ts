import Dexie, { type Table } from "dexie";
import type {
  Aprobacion,
  CheckIn,
  CheckOut,
  Costo,
  EscenarioBase,
  FactorEmision,
  HistorialAuditoria,
  Incidencia,
  Mantenimiento,
  MetaGerencial,
  Notificacion,
  Reservacion,
  Rol,
  Solicitud,
  Tarifa,
  Territorio,
  UbicacionGPS,
  Usuario,
  Vehiculo,
} from "@/lib/models";

export class MobilityDexieDB extends Dexie {
  usuarios!: Table<Usuario, string>;
  roles!: Table<Rol, string>;
  territorios!: Table<Territorio, string>;
  vehiculos!: Table<Vehiculo, string>;
  solicitudes!: Table<Solicitud, string>;
  reservaciones!: Table<Reservacion, string>;
  aprobaciones!: Table<Aprobacion, string>;
  checkIns!: Table<CheckIn, string>;
  checkOuts!: Table<CheckOut, string>;
  incidencias!: Table<Incidencia, string>;
  mantenimientos!: Table<Mantenimiento, string>;
  ubicacionesGPS!: Table<UbicacionGPS, string>;
  tarifas!: Table<Tarifa, string>;
  costos!: Table<Costo, string>;
  factoresEmision!: Table<FactorEmision, string>;
  escenariosBase!: Table<EscenarioBase, string>;
  metasGerenciales!: Table<MetaGerencial, string>;
  notificaciones!: Table<Notificacion, string>;
  historialAuditoria!: Table<HistorialAuditoria, string>;

  constructor() {
    super("movilidad-corporativa-db");
    this.version(1).stores({
      usuarios: "id, correoCorporativo, rol, territorioId, status",
      roles: "id, nombreRol, status",
      territorios: "id, codigoTerritorio, responsableId, status",
      vehiculos: "id, modalidad, territorioId, estadoOperativo, disponibilidadActual, status",
      solicitudes: "id, usuarioSolicitanteId, territorioId, estadoSolicitud, fechaSolicitud, status",
      reservaciones: "id, solicitudId, vehiculoId, estadoReservacion, status",
      aprobaciones: "id, solicitudId, aprobadorId, decision, status",
      checkIns: "id, reservacionId, usuarioId, status",
      checkOuts: "id, reservacionId, usuarioId, status",
      incidencias: "id, reservacionId, vehiculoId, estadoIncidencia, status",
      mantenimientos: "id, vehiculoId, tipoMantenimiento, status",
      ubicacionesGPS: "id, vehiculoId, timestampLectura, status",
      tarifas: "id, modalidad, status",
      costos: "id, reservacionId, tarifaId, status",
      factoresEmision: "id, modalidad, status",
      escenariosBase: "id, periodo, status",
      metasGerenciales: "id, territorioId, tipoMeta, status",
      notificaciones: "id, usuarioDestinoId, solicitudId, leida, status",
      historialAuditoria: "id, entidad, entidadId, usuarioId, fechaCambio, status",
    });
  }
}

export const db = new MobilityDexieDB();
