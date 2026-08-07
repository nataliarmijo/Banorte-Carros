import type { ModalidadVehiculo, Vehiculo } from "@/lib/models";
import type { VehiculoCatalogoItem } from "@/lib/adapters/vehiculos";

export interface FiltrosVehiculos {
  busqueda: string;
  territorio: string | "TODOS";
  modalidad: ModalidadVehiculo | "TODOS";
  estado: Vehiculo["estadoOperativo"] | "TODOS";
}

export const FILTROS_INICIALES: FiltrosVehiculos = {
  busqueda: "",
  territorio: "TODOS",
  modalidad: "TODOS",
  estado: "TODOS",
};

export function aplicarFiltros(items: VehiculoCatalogoItem[], filtros: FiltrosVehiculos): VehiculoCatalogoItem[] {
  const busqueda = filtros.busqueda.trim().toLowerCase();

  return items.filter(({ vehiculo }) => {
    if (busqueda) {
      const coincide =
        vehiculo.placa.toLowerCase().includes(busqueda) ||
        vehiculo.marca.toLowerCase().includes(busqueda) ||
        vehiculo.modelo.toLowerCase().includes(busqueda) ||
        vehiculo.tipoVehiculo.toLowerCase().includes(busqueda);
      if (!coincide) return false;
    }
    if (filtros.territorio !== "TODOS" && vehiculo.territorioId !== filtros.territorio) return false;
    if (filtros.modalidad !== "TODOS" && vehiculo.modalidad !== filtros.modalidad) return false;
    if (filtros.estado !== "TODOS" && vehiculo.estadoOperativo !== filtros.estado) return false;
    return true;
  });
}
