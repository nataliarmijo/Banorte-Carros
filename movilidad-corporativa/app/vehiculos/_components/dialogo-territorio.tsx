"use client";

import { useState } from "react";
import { MapPinned } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { cambiarTerritorio } from "@/lib/adapters/vehiculos";
import { esResultadoSinDatos } from "@/lib/services/types";
import { toast } from "@/lib/toast";

const TERRITORIO_ITEMS: Record<string, string> = Object.fromEntries(
  Object.entries(PARAMS_CONFIG.territorios).map(([id, info]) => [id, info.nombre])
);

interface DialogoTerritorioProps {
  vehiculoId: string;
  placa: string;
  territorioActualId: string;
  usuarioId: string;
  onConfirmado: () => Promise<void> | void;
}

export function DialogoTerritorio({ vehiculoId, placa, territorioActualId, usuarioId, onConfirmado }: DialogoTerritorioProps) {
  const [open, setOpen] = useState(false);
  const [territorioNuevo, setTerritorioNuevo] = useState(territorioActualId);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (territorioNuevo === territorioActualId) return;
    setEnviando(true);
    setError(null);
    try {
      const resultado = await cambiarTerritorio(vehiculoId, territorioNuevo, usuarioId);
      if (esResultadoSinDatos(resultado)) {
        setError(resultado.detalle);
        toast.error("No se pudo cambiar el territorio", resultado.detalle);
        return;
      }
      toast.success(`${placa} se movió a ${TERRITORIO_ITEMS[territorioNuevo]}`);
      setOpen(false);
      await onConfirmado();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <MapPinned className="h-3.5 w-3.5" /> Cambiar territorio
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cambiar territorio de {placa}</AlertDialogTitle>
          <AlertDialogDescription>El cambio queda registrado en el historial de auditoría del vehículo.</AlertDialogDescription>
        </AlertDialogHeader>

        <Select value={territorioNuevo} onValueChange={(v) => setTerritorioNuevo(v as string)} items={TERRITORIO_ITEMS}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Territorio" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TERRITORIO_ITEMS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>
                {etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error && <p className="text-xs text-red-700">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar} disabled={enviando || territorioNuevo === territorioActualId}>
            {enviando ? "Guardando..." : "Confirmar cambio"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
