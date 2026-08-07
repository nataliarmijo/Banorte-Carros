"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Ícono de información con tooltip, para aclarar el significado de un dato
 * que no es obvio a simple vista (p. ej. qué mide un criterio del puntaje
 * de asignación, o qué supuestos tiene un escenario base). Accesible por
 * teclado: el trigger es un <button> real, así que recibe foco con Tab y
 * el tooltip también se muestra con foco, no sólo con hover.
 */
export function InfoTooltip({ texto, className }: { texto: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button type="button" aria-label="Más información" className={cn("inline-flex text-slate-400 hover:text-slate-600", className)}>
            <Info className="h-3.5 w-3.5" />
          </button>
        }
      />
      <TooltipContent>{texto}</TooltipContent>
    </Tooltip>
  );
}
