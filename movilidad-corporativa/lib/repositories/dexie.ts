import Dexie, { type Table } from "dexie";
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
  ParametroOperativo,
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
  registrosAuditoria!: Table<RegistroAuditoria, string>;
  parametrosOperativos!: Table<ParametroOperativo, string>;

  constructor() {
    super("movilidad-corporativa-db");
    this.version(1).stores({
      usuarios: "id, correoCorporativo, rol, territorioId, estatus",
      roles: "id, nombreRol, estatus",
      territorios: "id, codigoTerritorio, responsableId, estatus",
      vehiculos: "id, modalidad, territorioId, estadoOperativo, disponibilidadActual, estatus",
      solicitudes: "id, usuarioSolicitanteId, territorioId, estadoSolicitud, fechaSolicitud, estatus",
      reservaciones: "id, solicitudId, vehiculoId, estadoReservacion, estatus",
      aprobaciones: "id, solicitudId, aprobadorId, decision, estatus",
      checkIns: "id, reservacionId, usuarioId, estatus",
      checkOuts: "id, reservacionId, usuarioId, estatus",
      incidencias: "id, reservacionId, vehiculoId, estadoIncidencia, estatus",
      mantenimientos: "id, vehiculoId, tipoMantenimiento, estatus",
      ubicacionesGPS: "id, vehiculoId, timestampLectura, estatus",
      tarifas: "id, modalidad, estatus",
      costos: "id, reservacionId, tarifaId, estatus",
      factoresEmision: "id, modalidad, tipoCombustible, tipoVehiculo, estatus",
      escenariosBase: "id, periodo, estatus",
      metasGerenciales: "id, territorioId, tipoMeta, estatus",
      notificaciones: "id, usuarioDestinoId, solicitudId, leida, estatus",
      registrosAuditoria: "id, entidad, entidadId, usuarioId, fechaCambio, estatus",
    });
    this.version(2).stores({
      parametrosOperativos: "id, clave, estatus",
    });
  }
}

export const db = new MobilityDexieDB();

// Si otra pestaña abre una versión más nueva del esquema, esta conexión debe
// cerrarse para liberar el bloqueo; de lo contrario IndexedDB deja la
// solicitud de upgrade de la otra pestaña "blocked" indefinidamente y todas
// las pestañas (incluida esta) se quedan colgadas esperando a que la base
// de datos abra.
db.on("versionchange", () => {
  db.close();
  if (typeof window !== "undefined") {
    window.location.reload();
  }
});
