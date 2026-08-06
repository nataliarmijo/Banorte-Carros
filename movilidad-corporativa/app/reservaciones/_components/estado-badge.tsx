import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EstadoSolicitud } from "@/lib/models";
import { ESTADO_ESTILOS, ESTADO_ICONOS, ESTADO_LABELS } from "@/lib/ui/estado-solicitud";

export function EstadoBadge({ estado, className }: { estado: EstadoSolicitud; className?: string }) {
  const Icono = ESTADO_ICONOS[estado];
  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent font-medium", ESTADO_ESTILOS[estado], className)}>
      <Icono className="h-3 w-3" />
      {ESTADO_LABELS[estado]}
    </Badge>
  );
}
