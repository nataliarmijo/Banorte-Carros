import type { EstadoIncidencia, NivelPrioridad, TipoIncidencia } from "@/lib/models";
import type { IncidenciaListItem } from "@/lib/adapters/incidencias";

export interface FiltrosIncidencias {
  tipo: TipoIncidencia | "TODOS";
  severidad: NivelPrioridad | "TODOS";
  estado: EstadoIncidencia | "TODOS";
  territorio: string | "TODOS";
  responsable: string | "TODOS";
}

export const FILTROS_INICIALES: FiltrosIncidencias = {
  tipo: "TODOS",
  severidad: "TODOS",
  estado: "TODOS",
  territorio: "TODOS",
  responsable: "TODOS",
};

export function aplicarFiltros(items: IncidenciaListItem[], filtros: FiltrosIncidencias): IncidenciaListItem[] {
  return items.filter(({ incidencia, vehiculo }) => {
    if (filtros.tipo !== "TODOS" && incidencia.tipoIncidencia !== filtros.tipo) return false;
    if (filtros.severidad !== "TODOS" && incidencia.severidad !== filtros.severidad) return false;
    if (filtros.estado !== "TODOS" && incidencia.estadoIncidencia !== filtros.estado) return false;
    if (filtros.territorio !== "TODOS" && vehiculo?.territorioId !== filtros.territorio) return false;
    if (filtros.responsable !== "TODOS" && incidencia.responsableId !== filtros.responsable) return false;
    return true;
  });
}
