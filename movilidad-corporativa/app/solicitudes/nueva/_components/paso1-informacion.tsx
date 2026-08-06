"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNuevaSolicitudStore } from "@/lib/stores/nueva-solicitud";
import { estimarCasetas, estimarEstacionamiento } from "@/lib/services/servicio-costos";
import { validarPaso1, type ErroresPaso1 } from "../_lib/schema";
import { estimarDistanciaSimulada, estimarDuracionMinutos, TERRITORIOS_ITEMS, TERRITORIOS_OPCIONES, TIPO_VEHICULO_LABELS } from "../_lib/utils";

function CampoError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{mensaje}</p>;
}

export function Paso1Informacion() {
  const { datos, distanciaEditadaManualmente, setDatos, marcarDistanciaEditadaManualmente, irAPaso } =
    useNuevaSolicitudStore();
  const [errores, setErrores] = useState<ErroresPaso1>({});

  const distanciaKm = Number(datos.distanciaEstimadaKm) || 0;
  const duracionMinutos = useMemo(() => estimarDuracionMinutos(distanciaKm), [distanciaKm]);
  const estacionamientoEstimado = useMemo(
    () => (distanciaKm > 0 ? estimarEstacionamiento(duracionMinutos) : 0),
    [distanciaKm, duracionMinutos]
  );
  const casetasEstimadas = useMemo(() => (distanciaKm > 0 ? estimarCasetas(distanciaKm) : 0), [distanciaKm]);

  function actualizarOrigenDestino(patch: Partial<{ origen: string; destino: string }>) {
    const origen = patch.origen ?? datos.origen;
    const destino = patch.destino ?? datos.destino;
    setDatos(patch);

    if (!distanciaEditadaManualmente && origen.trim().length >= 2 && destino.trim().length >= 2) {
      const sugerida = estimarDistanciaSimulada(origen, destino);
      setDatos({ distanciaEstimadaKm: String(sugerida) });
    }
  }

  function handleContinuar() {
    const validado = validarPaso1(datos);
    if (!validado.exito) {
      setErrores(validado.errores);
      return;
    }
    setErrores({});
    irAPaso(2);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Ruta y horario</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="territorio">Territorio</Label>
            <Select
              value={datos.territorio}
              onValueChange={(v) => setDatos({ territorio: v as string })}
              items={TERRITORIOS_ITEMS}
            >
              <SelectTrigger id="territorio" className="mt-1.5 w-full">
                <SelectValue placeholder="Selecciona un territorio" />
              </SelectTrigger>
              <SelectContent>
                {TERRITORIOS_OPCIONES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CampoError mensaje={errores.territorio} />
          </div>

          <div>
            <Label htmlFor="fechaSalida">Fecha de salida</Label>
            <Input
              id="fechaSalida"
              type="date"
              className="mt-1.5"
              value={datos.fechaSalida}
              onChange={(e) => setDatos({ fechaSalida: e.target.value })}
            />
            <CampoError mensaje={errores.fechaSalida} />
          </div>
          <div>
            <Label htmlFor="horaSalida">Hora de salida</Label>
            <Input
              id="horaSalida"
              type="time"
              className="mt-1.5"
              value={datos.horaSalida}
              onChange={(e) => setDatos({ horaSalida: e.target.value })}
            />
            <CampoError mensaje={errores.horaSalida} />
          </div>

          <div>
            <Label htmlFor="fechaRegreso">Fecha de regreso</Label>
            <Input
              id="fechaRegreso"
              type="date"
              className="mt-1.5"
              value={datos.fechaRegreso}
              onChange={(e) => setDatos({ fechaRegreso: e.target.value })}
            />
            <CampoError mensaje={errores.fechaRegreso} />
          </div>
          <div>
            <Label htmlFor="horaRegreso">Hora de regreso</Label>
            <Input
              id="horaRegreso"
              type="time"
              className="mt-1.5"
              value={datos.horaRegreso}
              onChange={(e) => setDatos({ horaRegreso: e.target.value })}
            />
            <CampoError mensaje={errores.horaRegreso} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Origen y destino</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="origen">Origen</Label>
            <Input
              id="origen"
              placeholder="Ej. Torre Banorte"
              className="mt-1.5"
              value={datos.origen}
              onChange={(e) => actualizarOrigenDestino({ origen: e.target.value })}
            />
            <CampoError mensaje={errores.origen} />
          </div>
          <div>
            <Label htmlFor="destino">Destino</Label>
            <Input
              id="destino"
              placeholder="Ej. Aeropuerto"
              className="mt-1.5"
              value={datos.destino}
              onChange={(e) => actualizarOrigenDestino({ destino: e.target.value })}
            />
            <CampoError mensaje={errores.destino} />
          </div>

          <div>
            <Label htmlFor="distancia">Distancia estimada (km)</Label>
            <Input
              id="distancia"
              type="number"
              min={0}
              className="mt-1.5"
              value={datos.distanciaEstimadaKm}
              onChange={(e) => {
                marcarDistanciaEditadaManualmente();
                setDatos({ distanciaEstimadaKm: e.target.value });
              }}
            />
            <p className="mt-1 text-xs text-slate-500">
              Sugerida automáticamente a partir de origen/destino (simulada); puedes ajustarla.
            </p>
            <CampoError mensaje={errores.distanciaEstimadaKm} />
          </div>
          <div>
            <Label htmlFor="pasajeros">Número de pasajeros</Label>
            <Input
              id="pasajeros"
              type="number"
              min={1}
              className="mt-1.5"
              value={datos.pasajeros}
              onChange={(e) => setDatos({ pasajeros: e.target.value })}
            />
            <CampoError mensaje={errores.pasajeros} />
          </div>
        </div>

        {distanciaKm > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Estacionamiento estimado</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                ${estacionamientoEstimado.toFixed(0)} MXN
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Casetas estimadas</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">${casetasEstimadas.toFixed(0)} MXN</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Detalles del viaje</h3>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="motivo">Motivo del viaje</Label>
            <Textarea
              id="motivo"
              placeholder="Ej. Visita a cliente, reunión ejecutiva, entrega de documentos..."
              className="mt-1.5"
              value={datos.motivoViaje}
              onChange={(e) => setDatos({ motivoViaje: e.target.value })}
            />
            <CampoError mensaje={errores.motivoViaje} />
          </div>

          <div>
            <Label htmlFor="tipoVehiculo">Tipo de vehículo requerido</Label>
            <Select
              value={datos.tipoVehiculoRequerido}
              onValueChange={(v) => setDatos({ tipoVehiculoRequerido: v as typeof datos.tipoVehiculoRequerido })}
              items={TIPO_VEHICULO_LABELS}
            >
              <SelectTrigger id="tipoVehiculo" className="mt-1.5 w-full">
                <SelectValue placeholder="Selecciona un tipo de vehículo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_VEHICULO_LABELS).map(([valor, etiqueta]) => (
                  <SelectItem key={valor} value={valor}>
                    {etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CampoError mensaje={errores.tipoVehiculoRequerido} />
          </div>

          <div>
            <Label htmlFor="necesidades">Necesidades especiales (opcional)</Label>
            <Textarea
              id="necesidades"
              placeholder="Ej. Silla de ruedas, aire acondicionado reforzado, cuna para bebé..."
              className="mt-1.5"
              value={datos.necesidadesEspeciales}
              onChange={(e) => setDatos({ necesidadesEspeciales: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2.5">
            <Checkbox
              checked={datos.transportaEquipo}
              onCheckedChange={(checked) => setDatos({ transportaEquipo: checked === true })}
            />
            <span className="text-sm text-slate-700">El viaje transporta equipo o materiales</span>
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleContinuar}>
          Continuar a evaluación
        </Button>
      </div>
    </div>
  );
}
