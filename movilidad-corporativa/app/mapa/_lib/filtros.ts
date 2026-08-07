import type { OrigenSolicitudMapa, VehiculoMapa, EstadoMapaVehiculo } from "@/lib/adapters/mapa";

export interface FiltrosMapa {
  territorio: string | "TODOS";
  estado: EstadoMapaVehiculo | "TODOS";
  modalidad: "POOL" | "ASIGNADO" | "TODOS";
}

export const FILTROS_INICIALES: FiltrosMapa = {
  territorio: "TODOS",
  estado: "TODOS",
  modalidad: "TODOS",
};

export function aplicarFiltrosVehiculos(vehiculos: VehiculoMapa[], filtros: FiltrosMapa): VehiculoMapa[] {
  return vehiculos.filter((v) => {
    if (filtros.territorio !== "TODOS" && v.vehiculo.territorioId !== filtros.territorio) return false;
    if (filtros.estado !== "TODOS" && v.estadoMapa !== filtros.estado) return false;
    if (filtros.modalidad !== "TODOS" && v.vehiculo.modalidad !== filtros.modalidad) return false;
    return true;
  });
}

export function aplicarFiltrosOrigenes(origenes: OrigenSolicitudMapa[], filtros: FiltrosMapa): OrigenSolicitudMapa[] {
  return origenes.filter((o) => {
    if (filtros.territorio !== "TODOS" && o.solicitud.territorioId !== filtros.territorio) return false;
    return true;
  });
}
