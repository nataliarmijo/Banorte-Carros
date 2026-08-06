import type { EstadoSolicitud, ModalidadVehiculo } from "@/lib/models";
import type { SolicitudListItem } from "@/lib/adapters/reservaciones";

export interface FiltrosReservaciones {
  busqueda: string;
  estado: EstadoSolicitud | "TODOS";
  territorio: string | "TODOS";
  medio: ModalidadVehiculo | "TODOS";
  fechaDesde: string;
  fechaHasta: string;
}

export const FILTROS_INICIALES: FiltrosReservaciones = {
  busqueda: "",
  estado: "TODOS",
  territorio: "TODOS",
  medio: "TODOS",
  fechaDesde: "",
  fechaHasta: "",
};

export function aplicarFiltros(items: SolicitudListItem[], filtros: FiltrosReservaciones): SolicitudListItem[] {
  const busqueda = filtros.busqueda.trim().toLowerCase();

  return items.filter(({ solicitud }) => {
    if (busqueda) {
      const coincide =
        solicitud.folio.toLowerCase().includes(busqueda) || solicitud.destino.toLowerCase().includes(busqueda);
      if (!coincide) return false;
    }
    if (filtros.estado !== "TODOS" && solicitud.estadoSolicitud !== filtros.estado) return false;
    if (filtros.territorio !== "TODOS" && solicitud.territorioId !== filtros.territorio) return false;
    if (filtros.medio !== "TODOS" && solicitud.modalidadRequerida !== filtros.medio) return false;
    if (filtros.fechaDesde && solicitud.fechaSolicitud < filtros.fechaDesde) return false;
    if (filtros.fechaHasta && solicitud.fechaSolicitud > filtros.fechaHasta) return false;
    return true;
  });
}
