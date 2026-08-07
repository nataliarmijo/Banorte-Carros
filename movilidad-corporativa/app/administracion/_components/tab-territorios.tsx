"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actualizarNombreTerritorio, crearTerritorio, type TerritorioConConteos } from "@/lib/adapters/administracion";
import { esResultadoSinDatos } from "@/lib/services/types";
import { toast } from "@/lib/toast";

function FilaTerritorio({ territorio, usuarioId, onCambio }: { territorio: TerritorioConConteos; usuarioId: string; onCambio: () => void }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(territorio.nombre);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const resultado = await actualizarNombreTerritorio(territorio.id, nombre, usuarioId);
    setGuardando(false);
    if (esResultadoSinDatos(resultado)) {
      setError(resultado.detalle);
      toast.error("No se pudo renombrar el territorio", resultado.detalle);
      return;
    }
    toast.success("Territorio renombrado");
    setEditando(false);
    onCambio();
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2 pr-3">
        {editando ? (
          <div className="flex items-center gap-2">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-48" />
            <Button size="sm" onClick={guardar} disabled={guardando}>
              {guardando ? "..." : "Guardar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditando(false);
                setNombre(territorio.nombre);
                setError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <button className="font-medium text-slate-900 underline decoration-dotted underline-offset-4 hover:text-blue-700" onClick={() => setEditando(true)}>
            {territorio.nombre}
          </button>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
      <td className="py-2 pr-3 text-slate-600">{territorio.vehiculos}</td>
      <td className="py-2 pr-3 text-slate-600">{territorio.usuarios}</td>
    </tr>
  );
}

function FormularioNuevoTerritorio({ usuarioId, onCreado }: { usuarioId: string; onCreado: () => void }) {
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    const resultado = await crearTerritorio(nombre, usuarioId);
    setEnviando(false);
    if (esResultadoSinDatos(resultado)) {
      setError(resultado.detalle);
      toast.error("No se pudo crear el territorio", resultado.detalle);
      return;
    }
    toast.success("Territorio creado", nombre);
    setNombre("");
    onCreado();
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <Input placeholder="Nombre del nuevo territorio" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-64" />
      <Button size="sm" onClick={enviar} disabled={enviando || !nombre.trim()}>
        <Plus className="h-4 w-4" /> {enviando ? "Creando..." : "Agregar territorio"}
      </Button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface TabTerritoriosProps {
  territorios: TerritorioConConteos[];
  usuarioId: string;
  onCambio: () => void;
}

export function TabTerritorios({ territorios, usuarioId, onCambio }: TabTerritoriosProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Territorios</h3>
        <p className="mt-1 text-sm text-slate-600">
          Da clic en un nombre para renombrarlo. Es la fuente que consumen todas las vistas de la app (filtros, etiquetas, distancias del motor de
          asignación).
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
              <th className="py-2 pr-3">Territorio</th>
              <th className="py-2 pr-3">Vehículos</th>
              <th className="py-2 pr-3">Usuarios</th>
            </tr>
          </thead>
          <tbody>
            {territorios.map((t) => (
              <FilaTerritorio key={t.id} territorio={t} usuarioId={usuarioId} onCambio={onCambio} />
            ))}
          </tbody>
        </table>
      </div>

      <FormularioNuevoTerritorio usuarioId={usuarioId} onCreado={onCambio} />
    </div>
  );
}
