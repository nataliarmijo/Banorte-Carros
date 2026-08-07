"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InfoDialogProps {
  titulo: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}

/** Modal de solo lectura (reutiliza AlertDialog) para "saltar directo al detalle" de un vehículo o una incidencia sin salir de /operacion. */
export function InfoDialog({ titulo, trigger, children }: InfoDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-2 text-sm text-slate-700">{children}</div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
