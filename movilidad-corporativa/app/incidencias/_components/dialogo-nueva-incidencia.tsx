"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FotosUploader } from "@/components/fotos-uploader";
import { crearIncidenciaManual } from "@/lib/adapters/incidencias";
import { esResultadoSinDatos } from "@/lib/services/types";
import { NIVELES_PRIORIDAD, SEVERIDAD_LABELS, TIPO_INCIDENCIA_LABELS, TIPOS_INCIDENCIA } from "@/lib/ui/incidencias";
import { validarIncidencia, type ErroresIncidencia } from "../_lib/schema";

interface DialogoNuevaIncidenciaProps {
  vehiculos: { id: string; nombre: string }[];
  responsables: { id: string; nombre: string }[];
  usuarioActivoId: string;
  onCreada: () => Promise<void> | void;
}

const TIPO_ITEMS = Object.fromEntries(TIPOS_INCIDENCIA.map((t) => [t, TIPO_INCIDENCIA_LABELS[t]]));
const SEVERIDAD_ITEMS = Object.fromEntries(NIVELES_PRIORIDAD.map((s) => [s, SEVERIDAD_LABELS[s]]));

export function DialogoNuevaIncidencia({ vehiculos, responsables, usuarioActivoId, onCreada }: DialogoNuevaIncidenciaProps) {
  const [open, setOpen] = useState(false);
  const [tipoIncidencia, setTipoIncidencia] = useState<string>("DANOS");
  const [severidad, setSeveridad] = useState<string>("MEDIA");
  const [vehiculoId, setVehiculoId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [responsableId, setResponsableId] = useState("");
  const [fechaCompromiso, setFechaCompromiso] = useState("");
  const [errores, setErrores] = useState<ErroresIncidencia>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function limpiar() {
    setTipoIncidencia("DANOS");
    setSeveridad("MEDIA");
    setVehiculoId("");
    setDescripcion("");
    setFotos([]);
    setResponsableId("");
    setFechaCompromiso("");
    setErrores({});
    setError(null);
  }

  async function confirmar() {
    const resultado = validarIncidencia({
      tipoIncidencia,
      severidad,
      vehiculoId,
      descripcion,
      responsableId: responsableId || undefined,
      fechaCompromiso: fechaCompromiso || undefined,
    });
    if (!resultado.exito) {
      setErrores(resultado.errores);
      return;
    }
    setErrores({});
    setEnviando(true);
    setError(null);
    try {
      const creada = await crearIncidenciaManual(
        {
          tipoIncidencia: resultado.datos.tipoIncidencia,
          severidad: resultado.datos.severidad,
          vehiculoId: resultado.datos.vehiculoId,
          descripcion: resultado.datos.descripcion,
          fotos,
          responsableId: resultado.datos.responsableId,
          fechaCompromiso: resultado.datos.fechaCompromiso,
        },
        usuarioActivoId
      );
      if (esResultadoSinDatos(creada)) {
        setError(creada.detalle);
        return;
      }
      setOpen(false);
      limpiar();
      await onCreada();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(siguiente) => {
        setOpen(siguiente);
        if (!siguiente) limpiar();
      }}
    >
      <AlertDialogTrigger render={<Button size="lg" />}>
        <PlusCircle className="h-4 w-4" /> Nueva incidencia
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Registrar incidencia</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipoIncidencia} onValueChange={(v) => setTipoIncidencia(v as string)} items={TIPO_ITEMS}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_ITEMS).map(([valor, etiqueta]) => (
                    <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Severidad</Label>
              <Select value={severidad} onValueChange={(v) => setSeveridad(v as string)} items={SEVERIDAD_ITEMS}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERIDAD_ITEMS).map(([valor, etiqueta]) => (
                    <SelectItem key={valor} value={valor}>{etiqueta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Vehículo</Label>
            <Select value={vehiculoId} onValueChange={(v) => setVehiculoId(v as string)} items={Object.fromEntries(vehiculos.map((v) => [v.id, v.nombre]))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona un vehículo" /></SelectTrigger>
              <SelectContent>
                {vehiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errores.vehiculoId && <p className="text-xs text-red-600">{errores.vehiculoId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descripcion-incidencia">Descripción</Label>
            <Textarea
              id="descripcion-incidencia"
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe qué ocurrió..."
            />
            {errores.descripcion && <p className="text-xs text-red-600">{errores.descripcion}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Responsable (opcional)</Label>
              <Select
                value={responsableId || "NINGUNO"}
                onValueChange={(v) => setResponsableId(v === "NINGUNO" ? "" : (v as string))}
                items={{ NINGUNO: "Sin asignar", ...Object.fromEntries(responsables.map((r) => [r.id, r.nombre])) }}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NINGUNO">Sin asignar</SelectItem>
                  {responsables.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha-compromiso">Fecha compromiso de resolución (opcional)</Label>
              <Input id="fecha-compromiso" type="date" value={fechaCompromiso} onChange={(e) => setFechaCompromiso(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Evidencia fotográfica (opcional)</Label>
            <FotosUploader fotos={fotos} onFotosChange={setFotos} carpeta="incidencias" />
          </div>
        </div>

        {error && <p className="text-xs text-red-700">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar} disabled={enviando}>
            {enviando ? "Guardando..." : "Registrar incidencia"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
