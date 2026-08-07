"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PARAMS_CONFIG } from "@/lib/config/params";
import type { RolNombre } from "@/lib/models";
import {
  actualizarUsuario,
  cambiarRolUsuario,
  cambiarTerritorioUsuario,
  crearUsuario,
  type DatosUsuario,
  type UsuarioConTerritorio,
} from "@/lib/adapters/administracion";
import { esResultadoSinDatos } from "@/lib/services/types";
import { toast } from "@/lib/toast";

const ROL_LABELS: Record<RolNombre, string> = {
  COLABORADOR: "Colaborador",
  APROBADOR: "Aprobador/Jefe",
  ADMIN_FLOTA: "Admin Flota",
  EJECUTIVO: "Ejecutivo",
};

const TERRITORIO_ITEMS: Record<string, string> = Object.fromEntries(Object.entries(PARAMS_CONFIG.territorios).map(([id, info]) => [id, info.nombre]));
const ROL_ITEMS: Record<string, string> = ROL_LABELS;

const DATOS_INICIALES: DatosUsuario = {
  nombreCompleto: "",
  correoCorporativo: "",
  empleadoId: "",
  rol: "COLABORADOR",
  territorioId: "territorio-cdmx",
  telefono: "",
  area: "",
};

function DialogoNuevoUsuario({ usuarioId, onCreado }: { usuarioId: string; onCreado: () => void }) {
  const [open, setOpen] = useState(false);
  const [datos, setDatos] = useState<DatosUsuario>(DATOS_INICIALES);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    const resultado = await crearUsuario(datos, usuarioId);
    setEnviando(false);
    if (esResultadoSinDatos(resultado)) {
      setError(resultado.detalle);
      toast.error("No se pudo crear el usuario", resultado.detalle);
      return;
    }
    toast.success("Usuario creado", datos.nombreCompleto);
    setDatos(DATOS_INICIALES);
    setOpen(false);
    onCreado();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button size="sm">
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Nuevo usuario</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-3 text-left">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Nombre completo</Label>
            <Input value={datos.nombreCompleto} onChange={(e) => setDatos({ ...datos, nombreCompleto: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Correo corporativo</Label>
            <Input type="email" value={datos.correoCorporativo} onChange={(e) => setDatos({ ...datos, correoCorporativo: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Número de empleado</Label>
            <Input value={datos.empleadoId} onChange={(e) => setDatos({ ...datos, empleadoId: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Rol</Label>
              <Select value={datos.rol} onValueChange={(v) => v && setDatos({ ...datos, rol: v as RolNombre })} items={ROL_ITEMS}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROL_ITEMS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Territorio</Label>
              <Select value={datos.territorioId} onValueChange={(v) => v && setDatos({ ...datos, territorioId: v })} items={TERRITORIO_ITEMS}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TERRITORIO_ITEMS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Área / departamento</Label>
            <Input value={datos.area} onChange={(e) => setDatos({ ...datos, area: e.target.value })} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={enviando}>
            {enviando ? "Creando..." : "Crear usuario"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DialogoEditarUsuario({ item, usuarioId, onGuardado }: { item: UsuarioConTerritorio; usuarioId: string; onGuardado: () => void }) {
  const [open, setOpen] = useState(false);
  const [datos, setDatos] = useState({
    nombreCompleto: item.usuario.nombreCompleto,
    correoCorporativo: item.usuario.correoCorporativo,
    empleadoId: item.usuario.empleadoId,
    telefono: item.usuario.telefono ?? "",
    area: item.usuario.area ?? "",
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    const resultado = await actualizarUsuario(item.usuario.id, datos, usuarioId);
    setEnviando(false);
    if (esResultadoSinDatos(resultado)) {
      setError(resultado.detalle);
      toast.error("No se pudo guardar el usuario", resultado.detalle);
      return;
    }
    toast.success("Usuario actualizado");
    setOpen(false);
    onGuardado();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button size="sm" variant="outline">Editar</Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Editar usuario</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-3 text-left">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Nombre completo</Label>
            <Input value={datos.nombreCompleto} onChange={(e) => setDatos({ ...datos, nombreCompleto: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Correo corporativo</Label>
            <Input type="email" value={datos.correoCorporativo} onChange={(e) => setDatos({ ...datos, correoCorporativo: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Número de empleado</Label>
            <Input value={datos.empleadoId} onChange={(e) => setDatos({ ...datos, empleadoId: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Teléfono</Label>
            <Input value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Área / departamento</Label>
            <Input value={datos.area} onChange={(e) => setDatos({ ...datos, area: e.target.value })} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface TabUsuariosProps {
  usuarios: UsuarioConTerritorio[];
  usuarioActivoId: string;
  onCambio: () => void;
}

export function TabUsuarios({ usuarios, usuarioActivoId, onCambio }: TabUsuariosProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Usuarios semilla</h3>
          <p className="mt-1 text-sm text-slate-600">
            Estos son los registros con los que se puede &ldquo;probar&rdquo; la app vía el selector de rol. Crear, editar o cambiar de rol/territorio aquí
            se refleja de inmediato ahí.
          </p>
        </div>
        <DialogoNuevoUsuario usuarioId={usuarioActivoId} onCreado={onCambio} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
              <th className="py-2 pr-3">Nombre</th>
              <th className="py-2 pr-3">Correo</th>
              <th className="py-2 pr-3">Rol</th>
              <th className="py-2 pr-3">Territorio</th>
              <th className="py-2 pr-3">Área</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((item) => (
              <tr key={item.usuario.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-3 font-medium text-slate-900">
                  {item.usuario.nombreCompleto}
                  {item.usuario.id === usuarioActivoId && <Badge variant="secondary" className="ml-2">Tú</Badge>}
                </td>
                <td className="py-2 pr-3 text-slate-600">{item.usuario.correoCorporativo}</td>
                <td className="py-2 pr-3">
                  <Select
                    value={item.usuario.rol}
                    onValueChange={async (v) => {
                      if (!v || v === item.usuario.rol) return;
                      const resultado = await cambiarRolUsuario(item.usuario.id, v as RolNombre, usuarioActivoId);
                      if (esResultadoSinDatos(resultado)) {
                        toast.error("No se pudo cambiar el rol", resultado.detalle);
                        return;
                      }
                      toast.success(`${item.usuario.nombreCompleto} ahora es ${ROL_ITEMS[v]}`);
                      onCambio();
                    }}
                    items={ROL_ITEMS}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROL_ITEMS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2 pr-3">
                  <Select
                    value={item.usuario.territorioId}
                    onValueChange={async (v) => {
                      if (!v || v === item.usuario.territorioId) return;
                      const resultado = await cambiarTerritorioUsuario(item.usuario.id, v, usuarioActivoId);
                      if (esResultadoSinDatos(resultado)) {
                        toast.error("No se pudo cambiar el territorio", resultado.detalle);
                        return;
                      }
                      toast.success(`${item.usuario.nombreCompleto} se movió a ${TERRITORIO_ITEMS[v]}`);
                      onCambio();
                    }}
                    items={TERRITORIO_ITEMS}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TERRITORIO_ITEMS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2 pr-3 text-slate-600">{item.usuario.area ?? "—"}</td>
                <td className="py-2 pr-3">
                  <DialogoEditarUsuario item={item} usuarioId={usuarioActivoId} onGuardado={onCambio} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
