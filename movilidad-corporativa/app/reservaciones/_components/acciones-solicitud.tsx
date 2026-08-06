"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, Eye, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { esCancelable, type SolicitudListItem } from "@/lib/adapters/reservaciones";

interface AccionesSolicitudProps {
  item: SolicitudListItem;
  usuarioActivoId: string;
  onCancelar: (solicitudId: string) => Promise<void>;
  mostrarVerDetalle?: boolean;
  compacto?: boolean;
}

export function AccionesSolicitud({
  item,
  usuarioActivoId,
  onCancelar,
  mostrarVerDetalle = true,
  compacto = false,
}: AccionesSolicitudProps) {
  const [cancelando, setCancelando] = useState(false);
  const { solicitud } = item;

  const esDueño = solicitud.usuarioSolicitanteId === usuarioActivoId;
  const puedeCancelar = esDueño && esCancelable(solicitud);
  const puedeCheckIn = solicitud.estadoSolicitud === "LISTA_CHECK_IN";
  const puedeCheckOut = solicitud.estadoSolicitud === "EN_CURSO";

  async function confirmarCancelacion() {
    setCancelando(true);
    try {
      await onCancelar(solicitud.id);
    } finally {
      setCancelando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {mostrarVerDetalle && (
        <Button size={compacto ? "sm" : "default"} variant="outline" render={<Link href={`/reservaciones/${solicitud.id}`} />} nativeButton={false}>
          <Eye className="h-3.5 w-3.5" /> Ver detalle
        </Button>
      )}

      {puedeCheckIn && (
        <Button
          size={compacto ? "sm" : "default"}
          variant="outline"
          render={<Link href={`/check-in?reservacion=${solicitud.id}`} />}
          nativeButton={false}
        >
          <LogIn className="h-3.5 w-3.5" /> Check-in
        </Button>
      )}

      {puedeCheckOut && (
        <Button
          size={compacto ? "sm" : "default"}
          variant="outline"
          render={<Link href={`/check-out?reservacion=${solicitud.id}`} />}
          nativeButton={false}
        >
          <LogOut className="h-3.5 w-3.5" /> Check-out
        </Button>
      )}

      {puedeCancelar && (
        <AlertDialog>
          <AlertDialogTrigger render={<Button size={compacto ? "sm" : "default"} variant="destructive" />}>
            <Ban className="h-3.5 w-3.5" /> Cancelar
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar esta solicitud?</AlertDialogTitle>
              <AlertDialogDescription>
                El folio {solicitud.folio} pasará a estado Cancelada. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={confirmarCancelacion} disabled={cancelando}>
                {cancelando ? "Cancelando..." : "Sí, cancelar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
