"use client";

import { useState } from "react";
import { Ban, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { bloquearVehiculo, desbloquearVehiculo } from "@/lib/adapters/vehiculos";
import { esResultadoSinDatos } from "@/lib/services/types";
import { toast } from "@/lib/toast";

interface DialogoBloqueoProps {
  vehiculoId: string;
  placa: string;
  bloqueado: boolean;
  usuarioId: string;
  onConfirmado: () => Promise<void> | void;
}

export function DialogoBloqueo({ vehiculoId, placa, bloqueado, usuarioId, onConfirmado }: DialogoBloqueoProps) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (!bloqueado && motivo.trim().length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      const resultado = bloqueado
        ? await desbloquearVehiculo(vehiculoId, usuarioId)
        : await bloquearVehiculo(vehiculoId, motivo, usuarioId);
      if (esResultadoSinDatos(resultado)) {
        setError(resultado.detalle);
        toast.error(bloqueado ? "No se pudo desbloquear" : "No se pudo bloquear", resultado.detalle);
        return;
      }
      toast.success(bloqueado ? `${placa} desbloqueado` : `${placa} bloqueado`);
      setOpen(false);
      setMotivo("");
      await onConfirmado();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant={bloqueado ? "outline" : "destructive"} />}>
        {bloqueado ? (
          <>
            <ShieldCheck className="h-3.5 w-3.5" /> Desbloquear
          </>
        ) : (
          <>
            <Ban className="h-3.5 w-3.5" /> Bloquear
          </>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{bloqueado ? "¿Desbloquear este vehículo?" : "¿Bloquear este vehículo?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {bloqueado
              ? `${placa} volverá a estar disponible para nuevas reservaciones.`
              : `${placa} no podrá ser reservado ni asignado automáticamente hasta que lo desbloquees.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!bloqueado && (
          <Textarea
            placeholder="Motivo del bloqueo (obligatorio)..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
        )}

        {error && <p className="text-xs text-red-700">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant={bloqueado ? "default" : "destructive"}
            onClick={confirmar}
            disabled={enviando || (!bloqueado && motivo.trim().length === 0)}
          >
            {enviando ? "Guardando..." : bloqueado ? "Sí, desbloquear" : "Sí, bloquear"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
