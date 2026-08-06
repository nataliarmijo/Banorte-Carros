import { db } from "@/lib/repositories/dexie";
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
import type { Repository, QueryOptions } from "@/lib/repositories/base-repository";

const createRepository = <T extends { id: string }>(tableName: string) => ({
  create: async (item: T) => {
    await (db as any)[tableName].add(item);
    return item;
  },
  getById: async (id: string) => (db as any)[tableName].get(id),
  list: async (options?: QueryOptions<T>) => {
    const collection = (db as any)[tableName].toCollection();
    let items = await collection.toArray();
    if (options?.filters) {
      items = items.filter((item: T) => Object.entries(options.filters ?? {}).every(([key, value]) => (item as any)[key] === value));
    }
    if (options?.sortBy) {
      items.sort((a: T, b: T) => {
        const left = String((a as any)[options.sortBy as keyof T] ?? "");
        const right = String((b as any)[options.sortBy as keyof T] ?? "");
        return options.sortOrder === "desc" ? right.localeCompare(left) : left.localeCompare(right);
      });
    }
    if (options?.offset) {
      items = items.slice(options.offset);
    }
    if (options?.limit) {
      items = items.slice(0, options.limit);
    }
    return items;
  },
  update: async (id: string, item: Partial<T>) => {
    const existing = await (db as any)[tableName].get(id);
    if (!existing) return undefined;
    await (db as any)[tableName].update(id, item);
    return { ...existing, ...item } as T;
  },
  updateStatus: async (id: string, estatus: string) => {
    const existing = await (db as any)[tableName].get(id);
    if (!existing) return undefined;
    await (db as any)[tableName].update(id, { estatus });
    return { ...existing, estatus } as T;
  },
  delete: async (id: string) => {
    await (db as any)[tableName].delete(id);
  },
}) as Repository<T>;

export const usuariosRepository = createRepository<Usuario>("usuarios");
export const rolesRepository = createRepository<Rol>("roles");
export const territoriosRepository = createRepository<Territorio>("territorios");
export const vehiculosRepository = createRepository<Vehiculo>("vehiculos");
export const solicitudesRepository = createRepository<Solicitud>("solicitudes");
export const reservacionesRepository = createRepository<Reservacion>("reservaciones");
export const aprobacionesRepository = createRepository<Aprobacion>("aprobaciones");
export const checkInsRepository = createRepository<CheckIn>("checkIns");
export const checkOutsRepository = createRepository<CheckOut>("checkOuts");
export const incidenciasRepository = createRepository<Incidencia>("incidencias");
export const mantenimientosRepository = createRepository<Mantenimiento>("mantenimientos");
export const ubicacionesGPSRepository = createRepository<UbicacionGPS>("ubicacionesGPS");
export const tarifasRepository = createRepository<Tarifa>("tarifas");
export const costosRepository = createRepository<Costo>("costos");
export const factoresEmisionRepository = createRepository<FactorEmision>("factoresEmision");
export const escenariosBaseRepository = createRepository<EscenarioBase>("escenariosBase");
export const metasGerencialesRepository = createRepository<MetaGerencial>("metasGerenciales");
export const notificacionesRepository = createRepository<Notificacion>("notificaciones");
export const registrosAuditoriaRepository = createRepository<RegistroAuditoria>("registrosAuditoria");
