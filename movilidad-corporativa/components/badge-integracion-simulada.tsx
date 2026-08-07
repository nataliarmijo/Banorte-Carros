import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ETIQUETA_INTEGRACION_SIMULADA } from "@/lib/integraciones/tipos";

/**
 * Badge consistente para marcar cualquier resultado que venga de una
 * integración mock (/lib/integraciones): comparador (Uber), mapa (GPS),
 * notificaciones, check-in (firma), fotos (almacenamiento). Ver
 * /lib/integraciones/README.md para la lista completa.
 */
export function BadgeIntegracionSimulada({ titulo, className }: { titulo?: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      title={titulo ?? "Esta integración todavía no está conectada a un proveedor real."}
      className={cn("gap-1 border-amber-300 bg-amber-50 text-amber-800", className)}
    >
      <FlaskConical className="h-3 w-3" />
      {ETIQUETA_INTEGRACION_SIMULADA}
    </Badge>
  );
}
