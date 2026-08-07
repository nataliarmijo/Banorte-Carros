"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Fuel,
  Gauge,
  Key,
  Leaf,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorState, LoadingState } from "@/components/states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FotosUploader } from "@/components/fotos-uploader";
import { initializeDemoData } from "@/lib/seed/init";
import { useSessionStore } from "@/lib/stores/session";
import {
  obtenerContextoCheckOut,
  registrarCheckOut,
  type ContextoCheckOut,
  type ResumenCheckOut,
} from "@/lib/adapters/checkout";
import { validarDatosCheckOut } from "@/lib/services/servicio-checkout";
import { esResultadoSinDatos } from "@/lib/services/types";
import type { EstadoVehiculoDevolucion } from "@/lib/models";

const PRESETS_COMBUSTIBLE = [0, 25, 50, 75, 100];

const OPCIONES_ESTADO: { valor: EstadoVehiculoDevolucion; etiqueta: string; colorActivo: string }[] = [
  { valor: "BUENO", etiqueta: "Bueno", colorActivo: "border-emerald-600 bg-emerald-600 text-white" },
  { valor: "CON_OBSERVACIONES", etiqueta: "Con observaciones", colorActivo: "border-amber-500 bg-amber-500 text-white" },
  { valor: "CON_DANOS", etiqueta: "Con daños", colorActivo: "border-red-600 bg-red-600 text-white" },
];

export default function CheckOutPage() {
  return (
    <Suspense fallback={<AppShell><LoadingState message="Preparando tu check-out..." /></AppShell>}>
      <CheckOutContent />
    </Suspense>
  );
}

function CheckOutContent() {
  const searchParams = useSearchParams();
  const reservacionId = searchParams.get("reservacion");
  const { usuarioActivo } = useSessionStore();

  const [estado, setEstado] = useState<"cargando" | "bloqueado" | "listo" | "exito">("cargando");
  const [mensajeBloqueo, setMensajeBloqueo] = useState("");
  const [contexto, setContexto] = useState<ContextoCheckOut | null>(null);
  const [resumen, setResumen] = useState<ResumenCheckOut | null>(null);

  const [kilometrajeFinal, setKilometrajeFinal] = useState("");
  const [combustibleRestante, setCombustibleRestante] = useState(50);
  const [fotos, setFotos] = useState<string[]>([]);
  const [estadoVehiculo, setEstadoVehiculo] = useState<EstadoVehiculoDevolucion>("BUENO");
  const [llavesDevueltas, setLlavesDevueltas] = useState(false);
  const [danosDescripcion, setDanosDescripcion] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      await initializeDemoData();
      if (!reservacionId) {
        if (!cancelado) {
          setMensajeBloqueo("Abre el check-out desde una reservación en Mis reservaciones.");
          setEstado("bloqueado");
        }
        return;
      }

      const resultado = await obtenerContextoCheckOut(reservacionId);
      if (cancelado) return;

      if (esResultadoSinDatos(resultado)) {
        setMensajeBloqueo(resultado.detalle);
        setEstado("bloqueado");
        return;
      }

      setContexto(resultado);
      setKilometrajeFinal(String(resultado.checkIn.kilometrajeInicial));
      setCombustibleRestante(resultado.checkIn.combustibleInicial);
      setEstado("listo");
    })();

    return () => {
      cancelado = true;
    };
  }, [reservacionId]);

  const validacion = useMemo(() => {
    if (!contexto) return null;
    return validarDatosCheckOut({
      kilometrajeFinal: Number(kilometrajeFinal),
      kilometrajeInicial: contexto.checkIn.kilometrajeInicial,
      combustibleRestante,
      fotos,
      estadoVehiculo,
      llavesDevueltas,
      danosDescripcion,
    });
  }, [contexto, kilometrajeFinal, combustibleRestante, fotos, estadoVehiculo, llavesDevueltas, danosDescripcion]);

  async function confirmarDevolucion() {
    setIntentoEnviar(true);
    if (!contexto || !usuarioActivo || !validacion?.valido) return;

    setEnviando(true);
    setErrorEnvio(null);
    try {
      const resultado = await registrarCheckOut({
        reservacionId: contexto.reservacion.id,
        usuarioId: usuarioActivo.id,
        kilometrajeFinal: Number(kilometrajeFinal),
        combustibleRestante,
        fotos,
        estadoVehiculo,
        llavesDevueltas,
        danosDescripcion: danosDescripcion.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
      });

      if (esResultadoSinDatos(resultado)) {
        setErrorEnvio(resultado.detalle);
        return;
      }

      setResumen(resultado.resumen);
      setEstado("exito");
    } catch (error) {
      setErrorEnvio(error instanceof Error ? error.message : "Ocurrió un error inesperado al registrar el check-out.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-28">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Check-out digital</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Devolución del vehículo</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Registra el kilometraje y combustible finales, el estado del vehículo y la devolución de llaves para
            cerrar tu viaje.
          </p>
        </section>

        {estado === "cargando" && <LoadingState message="Preparando tu check-out..." />}

        {estado === "bloqueado" && (
          <ErrorState title="Check-out no disponible" description={mensajeBloqueo} action={<VolverAReservaciones />} />
        )}

        {estado === "exito" && contexto && resumen && (
          <ResumenFinal folio={contexto.solicitud.folio} resumen={resumen} />
        )}

        {estado === "listo" && contexto && usuarioActivo && (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Car className="h-4 w-4 text-slate-500" /> Vehículo en devolución
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Placas</dt>
                  <dd className="font-medium text-slate-900">{contexto.vehiculo.placa}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Modelo</dt>
                  <dd className="font-medium text-slate-900">
                    {contexto.vehiculo.marca} {contexto.vehiculo.modelo} · {contexto.vehiculo.tipoVehiculo}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Kilometraje inicial (check-in)</dt>
                  <dd className="font-medium text-slate-900">{contexto.checkIn.kilometrajeInicial.toLocaleString("es-MX")} km</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Combustible inicial (check-in)</dt>
                  <dd className="font-medium text-slate-900">{contexto.checkIn.combustibleInicial}%</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Gauge className="h-4 w-4 text-slate-500" /> Kilometraje y combustible final
              </div>

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="kilometraje-final">Kilometraje final (km)</Label>
                <Input
                  id="kilometraje-final"
                  type="number"
                  inputMode="numeric"
                  min={contexto.checkIn.kilometrajeInicial}
                  value={kilometrajeFinal}
                  onChange={(e) => setKilometrajeFinal(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Debe ser igual o mayor al kilometraje inicial ({contexto.checkIn.kilometrajeInicial.toLocaleString("es-MX")} km).
                </p>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="combustible-final" className="flex items-center gap-1.5">
                    <Fuel className="h-3.5 w-3.5" /> Nivel de combustible final
                  </Label>
                  <span className="text-sm font-semibold text-slate-900">{combustibleRestante}%</span>
                </div>
                <input
                  id="combustible-final"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={combustibleRestante}
                  onChange={(e) => setCombustibleRestante(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
                <div className="flex flex-wrap gap-2">
                  {PRESETS_COMBUSTIBLE.map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setCombustibleRestante(valor)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        combustibleRestante === valor
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {valor}%
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-semibold text-slate-900">Fotografías del vehículo al devolver</p>
              <div className="mt-3">
                <FotosUploader fotos={fotos} onFotosChange={setFotos} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-semibold text-slate-900">Estado general del vehículo</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {OPCIONES_ESTADO.map((opcion) => (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => setEstadoVehiculo(opcion.valor)}
                    className={`rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition sm:text-sm ${
                      estadoVehiculo === opcion.valor ? opcion.colorActivo : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opcion.etiqueta}
                  </button>
                ))}
              </div>

              {estadoVehiculo !== "BUENO" && (
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor="danos">
                    Describe {estadoVehiculo === "CON_DANOS" ? "los daños" : "las observaciones"}
                    {estadoVehiculo === "CON_DANOS" ? " (obligatorio)" : " (opcional)"}
                  </Label>
                  <Textarea
                    id="danos"
                    rows={3}
                    placeholder="Rayones, golpes, testigos encendidos, ruidos, etc."
                    value={danosDescripcion}
                    onChange={(e) => setDanosDescripcion(e.target.value)}
                  />
                  {estadoVehiculo === "CON_DANOS" && (
                    <p className="flex items-center gap-1 text-xs text-red-700">
                      <ShieldAlert className="h-3.5 w-3.5" /> Se abrirá una incidencia automáticamente con esta descripción.
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <label className="flex items-start gap-2.5">
                <Checkbox
                  checked={llavesDevueltas}
                  onCheckedChange={(checked) => setLlavesDevueltas(checked === true)}
                  className="mt-0.5"
                />
                <span className="flex items-center gap-1.5 text-sm text-slate-700">
                  <Key className="h-3.5 w-3.5" /> Confirmo la devolución de llaves
                </span>
              </label>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <Label htmlFor="observaciones-checkout">Comentarios libres (opcional)</Label>
              <Textarea
                id="observaciones-checkout"
                className="mt-1.5"
                rows={3}
                placeholder="Cualquier otro comentario sobre el viaje o el vehículo..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </section>

            {errorEnvio && <ErrorState title="No se pudo registrar el check-out" description={errorEnvio} />}

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
              <div className="mx-auto max-w-3xl">
                {intentoEnviar && validacion && !validacion.valido && (
                  <ul className="mb-2 space-y-1 text-xs text-red-700">
                    {validacion.errores.map((error) => (
                      <li key={error}>• {error}</li>
                    ))}
                  </ul>
                )}
                <Button size="lg" className="w-full" onClick={confirmarDevolucion} disabled={enviando}>
                  {enviando ? "Registrando check-out..." : "Confirmar devolución"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function ResumenFinal({ folio, resumen }: { folio: string; resumen: ResumenCheckOut }) {
  const ahorro = resumen.diferenciaCosto;

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        <h3 className="text-lg font-semibold text-emerald-900">¡Check-out confirmado! Gracias por tu viaje</h3>
        <p className="max-w-md text-sm text-emerald-800">
          El folio {folio} pasó a estado &quot;Completada&quot;. Aquí está el resumen de tu viaje.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Resumen del viaje</h3>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Km recorridos</dt>
            <dd className="text-lg font-semibold text-slate-900">{resumen.kilometrosRecorridos} km</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Duración real</dt>
            <dd className="text-lg font-semibold text-slate-900">
              {Math.floor(resumen.duracionRealMinutos / 60)}h {resumen.duracionRealMinutos % 60}min
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Retraso frente al regreso planeado</dt>
            <dd className="text-lg font-semibold text-slate-900">
              {resumen.retrasoMinutos > 0 ? `${resumen.retrasoMinutos} min` : "Sin retraso"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Costo real vs. estimado</dt>
            <dd className="text-lg font-semibold text-slate-900">
              ${Math.round(resumen.costoReal).toLocaleString("es-MX")} MXN
              <span className="ml-1 text-sm font-normal text-slate-500">
                (est. ${Math.round(resumen.costoEstimado).toLocaleString("es-MX")})
              </span>
            </dd>
            <p className={`mt-0.5 text-xs font-medium ${ahorro >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
              {ahorro >= 0
                ? `Ahorro de $${Math.round(ahorro).toLocaleString("es-MX")} MXN frente a lo estimado`
                : `$${Math.round(Math.abs(ahorro)).toLocaleString("es-MX")} MXN por encima de lo estimado`}
            </p>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs text-slate-500">
              <Leaf className="h-3 w-3" /> Emisiones reales
            </dt>
            <dd className="text-lg font-semibold text-slate-900">{(resumen.emisionesRealesGramos / 1000).toFixed(1)} kg CO₂</dd>
            <p className="mt-0.5 text-xs text-slate-500">
              Estimado: {(resumen.emisionesEstimadasGramos / 1000).toFixed(1)} kg CO₂
            </p>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Combustible consumido vs. esperado</dt>
            <dd className="text-lg font-semibold text-slate-900">
              {resumen.diferenciaCombustiblePorcentaje > 0 ? "+" : ""}
              {resumen.diferenciaCombustiblePorcentaje} pts
            </dd>
          </div>
        </dl>

        {resumen.fueraDeHorarioNoAutorizado && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Este viaje ocurrió fuera de horario laboral o en fin de semana sin autorización previa; se generó una
              incidencia para su revisión.
            </p>
          </div>
        )}

        {resumen.incidenciasCreadasIds.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Wrench className="h-3.5 w-3.5" />
            Se generaron {resumen.incidenciasCreadasIds.length} incidencia(s) automáticamente a partir de este check-out.
          </div>
        )}
      </section>

      <div className="flex justify-center">
        <VolverAReservaciones />
      </div>
    </div>
  );
}

function VolverAReservaciones() {
  return (
    <Button variant="outline" render={<Link href="/reservaciones" />} nativeButton={false}>
      <ShieldCheck className="h-3.5 w-3.5" /> Volver a Mis reservaciones
    </Button>
  );
}
