"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const ANCHO_CANVAS = 600;
const ALTO_CANVAS = 220;

interface FirmaCanvasProps {
  onFirmaChange: (dataUrl: string | null) => void;
}

/** Canvas simple de dibujo para capturar una firma electrónica simulada (funciona con mouse, touch y stylus vía Pointer Events). */
export function FirmaCanvas({ onFirmaChange }: FirmaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujandoRef = useRef(false);
  const [haDibujado, setHaDibujado] = useState(false);

  function posicionRelativa(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const escalaX = canvas.width / rect.width;
    const escalaY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * escalaX, y: (e.clientY - rect.top) * escalaY };
  }

  function iniciarTrazo(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    dibujandoRef.current = true;
    const { x, y } = posicionRelativa(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function continuarTrazo(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujandoRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = posicionRelativa(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!haDibujado) setHaDibujado(true);
  }

  function terminarTrazo() {
    if (!dibujandoRef.current) return;
    dibujandoRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) onFirmaChange(canvas.toDataURL("image/png"));
  }

  function limpiar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHaDibujado(false);
    onFirmaChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={ANCHO_CANVAS}
        height={ALTO_CANVAS}
        className="w-full touch-none rounded-2xl border border-dashed border-slate-300 bg-slate-50"
        onPointerDown={iniciarTrazo}
        onPointerMove={continuarTrazo}
        onPointerUp={terminarTrazo}
        onPointerLeave={terminarTrazo}
        onPointerCancel={terminarTrazo}
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-slate-500">Firma electrónica simulada · dibuja con el dedo o el mouse</p>
        <Button type="button" variant="ghost" size="sm" onClick={limpiar} disabled={!haDibujado}>
          Limpiar
        </Button>
      </div>
    </div>
  );
}
