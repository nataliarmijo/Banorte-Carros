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
import { listarCandidatosReasignacion, reasignarVehiculoOperacion } from "@/lib/adapters/operacion";
import { esResultadoSinDatos } from "@/lib/services/types";
import { toast } from "@/lib/toast";
import type { Reservacion, Solicitud, Vehiculo } from "@/lib/models";

interface DialogoReasignacionProps {
  solicitud: Solicitud;
  reservacion: Reservacion;
  vehiculoActual: Vehiculo | null;
  usuarioActivoId: string;
  trigger: React.ReactElement;
  onReasignado: () => Promise<void> | void;
}

/** Reasignación manual de vehículo (reutiliza reasignarManualmente del Chunk 5), con justificación obligatoria. */
export function DialogoReasignacion({
  solicitud,
  reservacion,
  vehiculoActual,
  usuarioActivoId,
  trigger,
  onReasignado,
}: DialogoReasignacionProps) {
  const [open, setOpen] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [candidatos, setCandidatos] = useState<Vehiculo[]>([]);
  const [vehiculoElegidoId, setVehiculoElegidoId] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarCambioAbierto(siguiente: boolean) {
    setOpen(siguiente);
    if (!siguiente) return;
    setCargando(true);
    setError(null);
    const lista = await listarCandidatosReasignacion(reservacion, solicitud.territorioId);
    setCandidatos(lista);
    setVehiculoElegidoId(lista[0]?.id ?? "");
    setCargando(false);
  }

  async function confirmar() {
    if (!vehiculoElegidoId || justificacion.trim().length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      const resultado = await reasignarVehiculoOperacion({
        solicitudId: solicitud.id,
        vehiculoNuevoId: vehiculoElegidoId,
        justificacion,
        usuarioId: usuarioActivoId,
      });
      if (esResultadoSinDatos(resultado)) {
        setError(resultado.detalle);
        toast.error("No se pudo reasignar el vehículo", resultado.detalle);
        return;
      }
      toast.success("Vehículo reasignado");
      setOpen(false);
      setJustificacion("");
      await onReasignado();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={manejarCambioAbierto}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reasignar vehículo</AlertDialogTitle>
          <AlertDialogDescription>
            Folio {solicitud.folio} · Vehículo actual:{" "}
            {vehiculoActual ? `${vehiculoActual.marca} ${vehiculoActual.modelo} (${vehiculoActual.placa})` : "sin asignar"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {cargando ? (
          <p className="text-sm text-slate-500">Buscando vehículos disponibles...</p>
        ) : candidatos.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay otros vehículos disponibles y compatibles en este territorio para el periodo de la reservación.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Selecciona el nuevo vehículo</p>
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {candidatos.map((v) => (
                <label
                  key={v.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${
                    vehiculoElegidoId === v.id ? "border-slate-900 bg-slate-50" : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="vehiculo-candidato"
                    checked={vehiculoElegidoId === v.id}
                    onChange={() => setVehiculoElegidoId(v.id)}
                  />
                  {v.marca} {v.modelo} ({v.placa})
                </label>
              ))}
            </div>
          </div>
        )}

        <Textarea
          placeholder="Justificación de la reasignación (obligatoria)..."
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          rows={3}
        />

        {error && <p className="text-xs text-red-700">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmar}
            disabled={enviando || !vehiculoElegidoId || justificacion.trim().length === 0 || candidatos.length === 0}
          >
            {enviando ? "Reasignando..." : "Confirmar reasignación"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
