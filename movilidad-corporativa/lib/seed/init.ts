import { db } from "@/lib/repositories/dexie";
import {
  demoAprobaciones,
  demoCheckIns,
  demoCheckOuts,
  demoCostos,
  demoEscenariosBase,
  demoFactoresEmision,
  demoIncidencias,
  demoMantenimientos,
  demoMetasGerenciales,
  demoNotificaciones,
  demoRegistrosAuditoria,
  demoReservaciones,
  demoRoles,
  demoSolicitudes,
  demoTarifas,
  demoTerritorios,
  demoUbicacionesGPS,
  demoUsuarios,
  demoVehiculos,
} from "@/lib/seed/demo-data";

export async function initializeDemoData() {
  const counts = await db.transaction("rw", db.tables, async () => {
    const existingUsers = await db.usuarios.count();
    if (existingUsers > 0) {
      return { seeded: false };
    }

    await db.roles.bulkAdd(demoRoles);
    await db.territorios.bulkAdd(demoTerritorios);
    await db.usuarios.bulkAdd(demoUsuarios);
    await db.vehiculos.bulkAdd(demoVehiculos);
    await db.solicitudes.bulkAdd(demoSolicitudes);
    await db.reservaciones.bulkAdd(demoReservaciones);
    await db.aprobaciones.bulkAdd(demoAprobaciones);
    await db.checkIns.bulkAdd(demoCheckIns);
    await db.checkOuts.bulkAdd(demoCheckOuts);
    await db.incidencias.bulkAdd(demoIncidencias);
    await db.mantenimientos.bulkAdd(demoMantenimientos);
    await db.ubicacionesGPS.bulkAdd(demoUbicacionesGPS);
    await db.tarifas.bulkAdd(demoTarifas);
    await db.costos.bulkAdd(demoCostos);
    await db.factoresEmision.bulkAdd(demoFactoresEmision);
    await db.escenariosBase.bulkAdd(demoEscenariosBase);
    await db.metasGerenciales.bulkAdd(demoMetasGerenciales);
    await db.notificaciones.bulkAdd(demoNotificaciones);
    await db.registrosAuditoria.bulkAdd(demoRegistrosAuditoria);

    return { seeded: true };
  });

  return counts;
}

export async function resetDemoData() {
  await db.delete();
  db.open();
  await initializeDemoData();
}
