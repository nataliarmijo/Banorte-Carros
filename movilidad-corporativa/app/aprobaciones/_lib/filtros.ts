import type { Alternativa } from "@/lib/services/types";
import type { SolicitudPendiente } from "@/lib/adapters/aprobaciones";

export interface FiltrosAprobaciones {
  territorio: string | "TODOS";
  urgencia: "TODAS" | "URGENTES";
  medio: Alternativa | "TODOS";
}

export const FILTROS_INICIALES: FiltrosAprobaciones = {
  territorio: "TODOS",
  urgencia: "TODAS",
  medio: "TODOS",
};

export function aplicarFiltros(items: SolicitudPendiente[], filtros: FiltrosAprobaciones): SolicitudPendiente[] {
  return items.filter((item) => {
    if (filtros.territorio !== "TODOS" && item.solicitud.territorioId !== filtros.territorio) return false;
    if (filtros.urgencia === "URGENTES" && !item.esUrgente) return false;
    if (filtros.medio !== "TODOS" && item.medioRecomendado !== filtros.medio) return false;
    return true;
  });
}
