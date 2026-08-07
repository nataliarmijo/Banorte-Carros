"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
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
import { cambiarEstadoIncidencia } from "@/lib/adapters/incidencias";
import { esResultadoSinDatos } from "@/lib/services/types";
import { toast } from "@/lib/toast";
import { ESTADO_INCIDENCIA_LABELS } from "@/lib/ui/incidencias";
import type { EstadoIncidencia } from "@/lib/models";

interface DialogoCambiarEstadoProps {
  incidenciaId: string;
  nuevoEstado: EstadoIncidencia;
  usuarioId: string;
  trigger: React.ReactElement;
  onConfirmado: () => Promise<void> | void;
}

const REQUIERE_COMENTARIO: Record<EstadoIncidencia, boolean> = {
  ABIERTA: false,
  EN_PROCESO: false,
  RESUELTA: true,
  CERRADA: true,
};

/** Confirma un cambio de estatus de la incidencia; exige comentario al marcarla Resuelta o Cerrada. */
export function DialogoCambiarEstado({ incidenciaId, nuevoEstado, usuarioId, trigger, onConfirmado }: DialogoCambiarEstadoProps) {
  const [open, setOpen] = useState(false);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiereComentario = REQUIERE_COMENTARIO[nuevoEstado];

  async function confirmar() {
    if (requiereComentario && comentario.trim().length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      const resultado = await cambiarEstadoIncidencia(incidenciaId, nuevoEstado, usuarioId, comentario);
      if (esResultadoSinDatos(resultado)) {
        setError(resultado.detalle);
        toast.error("No se pudo actualizar la incidencia", resultado.detalle);
        return;
      }
      toast.success(`Incidencia marcada como "${ESTADO_INCIDENCIA_LABELS[nuevoEstado]}"`);
      setOpen(false);
      setComentario("");
      await onConfirmado();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Marcar esta incidencia como &quot;{ESTADO_INCIDENCIA_LABELS[nuevoEstado]}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            {requiereComentario
              ? "Explica cómo se resolvió o por qué se cierra; quedará registrado en la bitácora y en auditoría."
              : "Este cambio quedará registrado en la bitácora de la incidencia."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Textarea
          placeholder={requiereComentario ? "Comentario (obligatorio)..." : "Comentario (opcional)..."}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
        />

        {error && <p className="text-xs text-red-700">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar} disabled={enviando || (requiereComentario && comentario.trim().length === 0)}>
            {enviando ? "Guardando..." : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
