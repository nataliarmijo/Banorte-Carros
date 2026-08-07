"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function obtenerValorPorRuta(obj: unknown, ruta: string): unknown {
  return ruta.split(".").reduce<unknown>((acc, clave) => {
    if (acc === null || acc === undefined || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[clave];
  }, obj);
}

function establecerValorPorRuta(obj: Record<string, unknown>, ruta: string, valor: unknown): void {
  const partes = ruta.split(".");
  let actual: Record<string, unknown> = obj;
  for (let i = 0; i < partes.length - 1; i++) {
    const parte = partes[i];
    if (typeof actual[parte] !== "object" || actual[parte] === null) actual[parte] = {};
    actual = actual[parte] as Record<string, unknown>;
  }
  actual[partes[partes.length - 1]] = valor;
}

export interface CampoFormulario {
  ruta: string;
  etiqueta: string;
  tipo?: "numero" | "texto";
  paso?: string;
}

interface FormularioCamposProps {
  valorInicial: unknown;
  campos: CampoFormulario[];
  soloLectura: boolean;
  guardando: boolean;
  error: string | null;
  exito: boolean;
  onGuardar: (valor: unknown) => void;
}

/** Formulario genérico de números/texto por ruta (p. ej. "casetas.minimo") sobre un valor de sección de /lib/config/runtime-config. */
export function FormularioCampos({ valorInicial, campos, soloLectura, guardando, error, exito, onGuardar }: FormularioCamposProps) {
  const [borrador, setBorrador] = useState<Record<string, unknown>>(() => JSON.parse(JSON.stringify(valorInicial)));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar(borrador);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campos.map((campo) => {
          const valor = obtenerValorPorRuta(borrador, campo.ruta);
          return (
            <div key={campo.ruta} className="space-y-1">
              <Label className="text-xs text-slate-600">{campo.etiqueta}</Label>
              <Input
                type={campo.tipo === "texto" ? "text" : "number"}
                step={campo.tipo === "texto" ? undefined : (campo.paso ?? "any")}
                value={valor === undefined || valor === null ? "" : String(valor)}
                disabled={soloLectura}
                onChange={(e) => {
                  const copia = JSON.parse(JSON.stringify(borrador));
                  establecerValorPorRuta(copia, campo.ruta, campo.tipo === "texto" ? e.target.value : Number(e.target.value));
                  setBorrador(copia);
                }}
              />
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {exito && !error && <p className="text-xs text-emerald-600">Cambios guardados.</p>}
      {!soloLectura && (
        <Button type="submit" size="sm" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </Button>
      )}
    </form>
  );
}

export { obtenerValorPorRuta, establecerValorPorRuta };
