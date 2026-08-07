"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
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
import { cambiarModalidad, type ModalidadFlotaVehiculo } from "@/lib/adapters/vehiculos";
import { esResultadoSinDatos } from "@/lib/services/types";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";

interface DialogoModalidadProps {
  vehiculoId: string;
  placa: string;
  modalidadActual: ModalidadFlotaVehiculo;
  usuarioId: string;
  onConfirmado: () => Promise<void> | void;
}

export function DialogoModalidad({ vehiculoId, placa, modalidadActual, usuarioId, onConfirmado }: DialogoModalidadProps) {
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalidadNueva: ModalidadFlotaVehiculo = modalidadActual === "POOL" ? "ASIGNADO" : "POOL";

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      const resultado = await cambiarModalidad(vehiculoId, modalidadNueva, usuarioId);
      if (esResultadoSinDatos(resultado)) {
        setError(resultado.detalle);
        return;
      }
      setOpen(false);
      await onConfirmado();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <Repeat className="h-3.5 w-3.5" /> Cambiar a {MEDIO_LABELS[modalidadNueva]}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Cambiar {placa} de {MEDIO_LABELS[modalidadActual]} a {MEDIO_LABELS[modalidadNueva]}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Este cambio queda registrado en auditoría y altera de inmediato el conteo Pool/Asignado que usa el
            dashboard ejecutivo para medir el avance hacia la meta 60/40 de composición de flotilla.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {modalidadNueva === "POOL" && modalidadActual === "ASIGNADO" && (
          <p className="text-xs text-amber-700">Si el vehículo tiene un usuario asignado, se le quitará al pasar a Pool.</p>
        )}

        {error && <p className="text-xs text-red-700">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar} disabled={enviando}>
            {enviando ? "Guardando..." : "Confirmar cambio"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
