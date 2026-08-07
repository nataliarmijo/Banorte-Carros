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
import { generarDatosHistoricos } from "@/lib/seed/historico";

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

/**
 * Genera y persiste ~12 meses de datos históricos (solicitudes, reservaciones,
 * check-outs, incidencias) para alimentar /analitica. Estrictamente aditivo e
 * idempotente: usa ids con el prefijo "*-hist-*" que nunca colisionan con el
 * seed base, y no toca ni es invocada por initializeDemoData(), así que no
 * afecta el conteo de datos que asumen las demás pantallas ni las pruebas.
 */
export async function initializeHistoricalData() {
  await initializeDemoData();

  const yaExiste = await db.solicitudes.where("id").startsWith("sol-hist-").count();
  if (yaExiste > 0) {
    return { seeded: false };
  }

  const [vehiculosBase, usuariosBase] = await Promise.all([db.vehiculos.toArray(), db.usuarios.toArray()]);
  const datos = generarDatosHistoricos(vehiculosBase, usuariosBase);

  await db.transaction("rw", db.solicitudes, db.reservaciones, db.checkOuts, db.incidencias, async () => {
    await db.solicitudes.bulkAdd(datos.solicitudes);
    await db.reservaciones.bulkAdd(datos.reservaciones);
    await db.checkOuts.bulkAdd(datos.checkOuts);
    await db.incidencias.bulkAdd(datos.incidencias);
  });

  return {
    seeded: true,
    solicitudes: datos.solicitudes.length,
    reservaciones: datos.reservaciones.length,
    checkOuts: datos.checkOuts.length,
    incidencias: datos.incidencias.length,
  };
}
