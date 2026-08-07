import type { EstadoSolicitud, ModalidadVehiculo } from "@/lib/models";
import type { FilaOperativa, IncidenciaOperativa, VehiculoOperativo } from "@/lib/adapters/operacion";

export interface FiltrosOperacion {
  territorio: string | "TODOS";
  tipoVehiculo: string | "TODOS";
  modalidad: ModalidadVehiculo | "TODOS";
  estado: EstadoSolicitud | "TODOS";
  responsable: string | "TODOS";
}

export const FILTROS_INICIALES: FiltrosOperacion = {
  territorio: "TODOS",
  tipoVehiculo: "TODOS",
  modalidad: "TODOS",
  estado: "TODOS",
  responsable: "TODOS",
};

export function aplicarFiltrosFilas(filas: FilaOperativa[], filtros: FiltrosOperacion): FilaOperativa[] {
  return filas.filter((f) => {
    if (filtros.territorio !== "TODOS" && f.solicitud.territorioId !== filtros.territorio) return false;
    if (filtros.tipoVehiculo !== "TODOS" && f.vehiculo?.tipoVehiculo !== filtros.tipoVehiculo) return false;
    if (filtros.modalidad !== "TODOS" && f.solicitud.modalidadRequerida !== filtros.modalidad) return false;
    if (filtros.estado !== "TODOS" && f.solicitud.estadoSolicitud !== filtros.estado) return false;
    if (filtros.responsable !== "TODOS" && f.solicitud.usuarioSolicitanteId !== filtros.responsable) return false;
    return true;
  });
}

export function aplicarFiltrosVehiculos(vehiculos: VehiculoOperativo[], filtros: FiltrosOperacion): VehiculoOperativo[] {
  return vehiculos.filter((v) => {
    if (filtros.territorio !== "TODOS" && v.vehiculo.territorioId !== filtros.territorio) return false;
    if (filtros.tipoVehiculo !== "TODOS" && v.vehiculo.tipoVehiculo !== filtros.tipoVehiculo) return false;
    if (filtros.modalidad !== "TODOS" && v.vehiculo.modalidad !== filtros.modalidad) return false;
    return true;
  });
}

export function aplicarFiltrosIncidencias(incidencias: IncidenciaOperativa[], filtros: FiltrosOperacion): IncidenciaOperativa[] {
  return incidencias.filter((i) => {
    if (filtros.territorio !== "TODOS" && i.vehiculo?.territorioId !== filtros.territorio) return false;
    if (filtros.tipoVehiculo !== "TODOS" && i.vehiculo?.tipoVehiculo !== filtros.tipoVehiculo) return false;
    if (filtros.modalidad !== "TODOS" && i.vehiculo?.modalidad !== filtros.modalidad) return false;
    return true;
  });
}
