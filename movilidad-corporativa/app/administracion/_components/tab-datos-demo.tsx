"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TabDatosDemoProps {
  counts: Record<string, number>;
  onReset: () => Promise<void>;
}

const ETIQUETAS: Record<string, string> = {
  usuarios: "Usuarios",
  territorios: "Territorios",
  vehiculos: "Vehículos",
  solicitudes: "Solicitudes",
  reservaciones: "Reservaciones",
  incidencias: "Incidencias",
  parametrosOperativos: "Parámetros operativos",
  registrosAuditoria: "Registros de auditoría",
};

export function TabDatosDemo({ counts, onReset }: TabDatosDemoProps) {
  const [open, setOpen] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);

  async function confirmar() {
    setReiniciando(true);
    await onReset();
    setReiniciando(false);
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Datos de demostración</h3>
            <p className="mt-1 text-sm text-slate-600">Conteo actual de registros persistidos en esta sesión del navegador.</p>
          </div>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger
              render={
                <Button variant="destructive">
                  <RotateCcw className="h-4 w-4" /> Restablecer datos demo
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Restablecer todos los datos de demostración?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto borra TODO lo que hayas capturado en esta sesión (usuarios, vehículos, solicitudes, reservaciones, incidencias, parámetros
                  editados, etc.) y vuelve a sembrar los datos y parámetros de fábrica del Chunk 2. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={reiniciando}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={confirmar} disabled={reiniciando}>
                  {reiniciando ? "Restableciendo..." : "Sí, restablecer todo"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(counts).map(([key, value]) => (
          <div key={key} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-500">{ETIQUETAS[key] ?? key}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
