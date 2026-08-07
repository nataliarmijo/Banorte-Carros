"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import { validarVehiculo, type DatosVehiculoValidados, type ErroresVehiculo } from "../_lib/schema";

export interface DatosVehiculoBorrador {
  placa: string;
  marca: string;
  modelo: string;
  anio: string;
  tipoVehiculo: string;
  modalidad: "POOL" | "ASIGNADO";
  territorio: string;
  ubicacion: string;
  capacidadPasajeros: string;
  combustibleTipo: string;
  kilometrajeActual: string;
  rendimientoKmPorLitro: string;
  costoPorKm: string;
  usuarioAsignadoId: string;
  proximaVerificacionFecha: string;
}

export function datosVehiculoIniciales(territorioActivo: string): DatosVehiculoBorrador {
  return {
    placa: "",
    marca: "",
    modelo: "",
    anio: String(new Date().getFullYear()),
    tipoVehiculo: "Sedán",
    modalidad: "POOL",
    territorio: territorioActivo,
    ubicacion: "",
    capacidadPasajeros: "4",
    combustibleTipo: "Gasolina",
    kilometrajeActual: "0",
    rendimientoKmPorLitro: "14",
    costoPorKm: "2.8",
    usuarioAsignadoId: "",
    proximaVerificacionFecha: "",
  };
}

const TERRITORIO_ITEMS: Record<string, string> = Object.fromEntries(
  Object.entries(PARAMS_CONFIG.territorios).map(([id, info]) => [id, info.nombre])
);
const MODALIDAD_ITEMS: Record<string, string> = { POOL: MEDIO_LABELS.POOL, ASIGNADO: MEDIO_LABELS.ASIGNADO };
const COMBUSTIBLE_ITEMS: Record<string, string> = {
  Gasolina: "Gasolina",
  Diesel: "Diésel",
  Híbrido: "Híbrido",
  Eléctrico: "Eléctrico",
};

interface FormularioVehiculoProps {
  datos: DatosVehiculoBorrador;
  onDatosChange: (patch: Partial<DatosVehiculoBorrador>) => void;
  modoEdicion: boolean;
  usuariosParaAsignar: { id: string; nombre: string }[];
  onSubmit: (datos: DatosVehiculoValidados) => Promise<void>;
  enviando: boolean;
  errorEnvio: string | null;
  textoBoton: string;
}

export function FormularioVehiculo({
  datos,
  onDatosChange,
  modoEdicion,
  usuariosParaAsignar,
  onSubmit,
  enviando,
  errorEnvio,
  textoBoton,
}: FormularioVehiculoProps) {
  const [errores, setErrores] = useState<ErroresVehiculo>({});

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    const resultado = validarVehiculo(datos);
    if (!resultado.exito) {
      setErrores(resultado.errores);
      return;
    }
    setErrores({});
    await onSubmit(resultado.datos);
  }

  return (
    <form onSubmit={manejarSubmit} className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold text-slate-900">Identificación</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo label="Placa" error={errores.placa}>
            <Input value={datos.placa} onChange={(e) => onDatosChange({ placa: e.target.value })} placeholder="ABC-123" />
          </Campo>
          <Campo label="Marca" error={errores.marca}>
            <Input value={datos.marca} onChange={(e) => onDatosChange({ marca: e.target.value })} placeholder="Toyota" />
          </Campo>
          <Campo label="Modelo" error={errores.modelo}>
            <Input value={datos.modelo} onChange={(e) => onDatosChange({ modelo: e.target.value })} placeholder="Corolla" />
          </Campo>
          <Campo label="Año" error={errores.anio}>
            <Input type="number" inputMode="numeric" value={datos.anio} onChange={(e) => onDatosChange({ anio: e.target.value })} />
          </Campo>
          <Campo label="Tipo de vehículo" error={errores.tipoVehiculo}>
            <Input value={datos.tipoVehiculo} onChange={(e) => onDatosChange({ tipoVehiculo: e.target.value })} placeholder="Sedán, SUV..." />
          </Campo>
          <Campo label="Combustible" error={errores.combustibleTipo}>
            <Select
              value={datos.combustibleTipo}
              onValueChange={(v) => onDatosChange({ combustibleTipo: v as string })}
              items={COMBUSTIBLE_ITEMS}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Combustible" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COMBUSTIBLE_ITEMS).map(([valor, etiqueta]) => (
                  <SelectItem key={valor} value={valor}>
                    {etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold text-slate-900">Ubicación y modalidad</h3>
        {modoEdicion && (
          <p className="mt-1 text-xs text-slate-500">
            El territorio y la modalidad no se editan aquí: usa las acciones &quot;Cambiar territorio&quot; y &quot;Cambiar
            modalidad&quot; más abajo, para que el cambio quede registrado en auditoría.
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo label="Territorio" error={errores.territorio}>
            <Select
              value={datos.territorio}
              onValueChange={(v) => onDatosChange({ territorio: v as string })}
              items={TERRITORIO_ITEMS}
              disabled={modoEdicion}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Territorio" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TERRITORIO_ITEMS).map(([valor, etiqueta]) => (
                  <SelectItem key={valor} value={valor}>
                    {etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Modalidad" error={errores.modalidad}>
            <Select
              value={datos.modalidad}
              onValueChange={(v) => onDatosChange({ modalidad: v as "POOL" | "ASIGNADO" })}
              items={MODALIDAD_ITEMS}
              disabled={modoEdicion}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Modalidad" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODALIDAD_ITEMS).map(([valor, etiqueta]) => (
                  <SelectItem key={valor} value={valor}>
                    {etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Ubicación específica" error={errores.ubicacion}>
            <Input
              value={datos.ubicacion}
              onChange={(e) => onDatosChange({ ubicacion: e.target.value })}
              placeholder="Estacionamiento Torre Banorte, CDMX"
            />
          </Campo>

          {datos.modalidad === "ASIGNADO" && (
            <Campo label="Usuario asignado (opcional)">
              <Select
                value={datos.usuarioAsignadoId || "NINGUNO"}
                onValueChange={(v) => onDatosChange({ usuarioAsignadoId: v === "NINGUNO" ? "" : (v as string) })}
                items={{ NINGUNO: "Sin asignar", ...Object.fromEntries(usuariosParaAsignar.map((u) => [u.id, u.nombre])) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NINGUNO">Sin asignar</SelectItem>
                  {usuariosParaAsignar.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold text-slate-900">Ficha técnica</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo label="Capacidad de pasajeros" error={errores.capacidadPasajeros}>
            <Input
              type="number"
              inputMode="numeric"
              value={datos.capacidadPasajeros}
              onChange={(e) => onDatosChange({ capacidadPasajeros: e.target.value })}
            />
          </Campo>
          <Campo label="Kilometraje actual (km)" error={errores.kilometrajeActual}>
            <Input
              type="number"
              inputMode="numeric"
              value={datos.kilometrajeActual}
              onChange={(e) => onDatosChange({ kilometrajeActual: e.target.value })}
            />
          </Campo>
          <Campo label="Rendimiento (km/litro)" error={errores.rendimientoKmPorLitro}>
            <Input
              type="number"
              step="0.1"
              value={datos.rendimientoKmPorLitro}
              onChange={(e) => onDatosChange({ rendimientoKmPorLitro: e.target.value })}
            />
          </Campo>
          <Campo label="Costo por km (MXN)" error={errores.costoPorKm}>
            <Input type="number" step="0.1" value={datos.costoPorKm} onChange={(e) => onDatosChange({ costoPorKm: e.target.value })} />
          </Campo>
          <Campo label="Próxima verificación / seguro (opcional)">
            <Input
              type="date"
              value={datos.proximaVerificacionFecha}
              onChange={(e) => onDatosChange({ proximaVerificacionFecha: e.target.value })}
            />
          </Campo>
        </div>
      </section>

      {errorEnvio && <ErrorState title="No se pudo guardar el vehículo" description={errorEnvio} />}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={enviando}>
          {enviando ? "Guardando..." : textoBoton}
        </Button>
      </div>
    </form>
  );
}

function Campo({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
