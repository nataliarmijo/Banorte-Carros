"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { programarMantenimiento } from "@/lib/adapters/vehiculos";
import { esResultadoSinDatos } from "@/lib/services/types";
import { toast } from "@/lib/toast";

interface DialogoMantenimientoProps {
  vehiculoId: string;
  placa: string;
  usuarioId: string;
  onConfirmado: () => Promise<void> | void;
}

export function DialogoMantenimiento({ vehiculoId, placa, usuarioId, onConfirmado }: DialogoMantenimientoProps) {
  const [open, setOpen] = useState(false);
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [tipoMantenimiento, setTipoMantenimiento] = useState("");
  const [responsable, setResponsable] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valido = fechaProgramada.length > 0 && tipoMantenimiento.trim().length > 0 && responsable.trim().length > 0;

  async function confirmar() {
    if (!valido) return;
    setEnviando(true);
    setError(null);
    try {
      const resultado = await programarMantenimiento(vehiculoId, { fechaProgramada, tipoMantenimiento, responsable }, usuarioId);
      if (esResultadoSinDatos(resultado)) {
        setError(resultado.detalle);
        toast.error("No se pudo programar el mantenimiento", resultado.detalle);
        return;
      }
      toast.success("Mantenimiento programado", placa);
      setOpen(false);
      setFechaProgramada("");
      setTipoMantenimiento("");
      setResponsable("");
      await onConfirmado();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <Wrench className="h-3.5 w-3.5" /> Programar mantenimiento
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Programar mantenimiento para {placa}</AlertDialogTitle>
          <AlertDialogDescription>
            Si la fecha es hoy o ya pasó, el vehículo se marcará &quot;En mantenimiento&quot; de inmediato y dejará de
            estar disponible para reservaciones.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fecha-mantenimiento">Fecha programada</Label>
            <Input id="fecha-mantenimiento" type="date" value={fechaProgramada} onChange={(e) => setFechaProgramada(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo-mantenimiento">Tipo de mantenimiento</Label>
            <Input
              id="tipo-mantenimiento"
              placeholder="Servicio mayor, cambio de aceite, revisión de frenos..."
              value={tipoMantenimiento}
              onChange={(e) => setTipoMantenimiento(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="responsable-mantenimiento">Taller / responsable (simulado)</Label>
            <Input
              id="responsable-mantenimiento"
              placeholder="Taller Banorte Norte"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-700">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar} disabled={enviando || !valido}>
            {enviando ? "Guardando..." : "Programar mantenimiento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
