"use client";

import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { proveedorAlmacenamiento } from "@/lib/integraciones/almacenamiento";
import { BadgeIntegracionSimulada } from "@/components/badge-integracion-simulada";

interface FotosUploaderProps {
  fotos: string[];
  onFotosChange: (fotos: string[]) => void;
  /** Carpeta lógica para el proveedor de almacenamiento, p. ej. "check-in" | "check-out" | "incidencias". */
  carpeta?: string;
}

/** Carga de fotos vía IProveedorAlmacenamiento (mock: las guarda como data URL, no sube a un servidor). Usado en check-in, check-out e incidencias. */
export function FotosUploader({ fotos, onFotosChange, carpeta = "general" }: FotosUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function manejarSeleccion(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    if (archivos.length === 0) return;
    const guardados = await Promise.all(archivos.map((archivo) => proveedorAlmacenamiento.guardarArchivo(archivo, carpeta)));
    onFotosChange([...fotos, ...guardados.map((g) => g.url)]);
    e.target.value = "";
  }

  function eliminar(indice: number) {
    void proveedorAlmacenamiento.eliminarArchivo(fotos[indice]);
    onFotosChange(fotos.filter((_, i) => i !== indice));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {fotos.map((foto, indice) => (
          <div key={indice} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200">
            {/* Fotos capturadas por el usuario en el dispositivo: no son assets estáticos del sitio. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt={`Foto ${indice + 1} del vehículo`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => eliminar(indice)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
              aria-label={`Eliminar foto ${indice + 1}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 text-slate-500 transition hover:bg-slate-50"
        >
          <Camera className="h-5 w-5" />
          <span className="text-xs">Agregar</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={manejarSeleccion}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <BadgeIntegracionSimulada titulo="Las fotos se guardan localmente como referencia (IndexedDB); no se suben a un servidor." />
        <p className="text-xs text-slate-500">Almacenamiento simulado: no se sube a un servidor.</p>
      </div>
    </div>
  );
}
