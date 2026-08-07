"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Car, CheckCircle2, Fuel, Gauge, ShieldCheck, User, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorState, LoadingState } from "@/components/states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initializeDemoData } from "@/lib/seed/init";
import { useSessionStore } from "@/lib/stores/session";
import { obtenerContextoCheckIn, registrarCheckIn, type ContextoCheckIn } from "@/lib/adapters/checkin";
import { validarDatosCheckIn } from "@/lib/services/servicio-checkin";
import { CHECKIN_CONFIG } from "@/lib/config/checkin";
import { esResultadoSinDatos } from "@/lib/services/types";
import { FotosUploader } from "@/components/fotos-uploader";
import { FirmaCanvas } from "./_components/firma-canvas";

const PRESETS_COMBUSTIBLE = [0, 25, 50, 75, 100];

export default function CheckInPage() {
  return (
    <Suspense fallback={<AppShell><LoadingState message="Preparando tu check-in..." /></AppShell>}>
      <CheckInContent />
    </Suspense>
  );
}

function CheckInContent() {
  const searchParams = useSearchParams();
  const reservacionId = searchParams.get("reservacion");
  const { usuarioActivo } = useSessionStore();

  const [estado, setEstado] = useState<"cargando" | "bloqueado" | "listo" | "exito">("cargando");
  const [mensajeBloqueo, setMensajeBloqueo] = useState("");
  const [contexto, setContexto] = useState<ContextoCheckIn | null>(null);

  const [kilometrajeInicial, setKilometrajeInicial] = useState("");
  const [combustibleInicial, setCombustibleInicial] = useState(50);
  const [fotos, setFotos] = useState<string[]>([]);
  const [responsivaAceptada, setResponsivaAceptada] = useState(false);
  const [firmaElectronica, setFirmaElectronica] = useState<string | null>(null);
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
          setMensajeBloqueo("Abre el check-in desde una reservación en Mis reservaciones.");
          setEstado("bloqueado");
        }
        return;
      }

      const resultado = await obtenerContextoCheckIn(reservacionId);
      if (cancelado) return;

      if (esResultadoSinDatos(resultado)) {
        setMensajeBloqueo(resultado.detalle);
        setEstado("bloqueado");
        return;
      }

      setContexto(resultado);
      setKilometrajeInicial(String(resultado.vehiculo.kilometrajeActual));
      setEstado("listo");
    })();

    return () => {
      cancelado = true;
    };
  }, [reservacionId]);

  const validacion = useMemo(() => {
    if (!contexto) return null;
    return validarDatosCheckIn({
      kilometrajeInicial: Number(kilometrajeInicial),
      kilometrajeActualVehiculo: contexto.vehiculo.kilometrajeActual,
      combustibleInicial,
      fotos,
      firmaElectronica: firmaElectronica ?? "",
      responsivaAceptada,
    });
  }, [contexto, kilometrajeInicial, combustibleInicial, fotos, firmaElectronica, responsivaAceptada]);

  async function confirmarRecepcion() {
    setIntentoEnviar(true);
    if (!contexto || !usuarioActivo || !validacion?.valido) return;

    setEnviando(true);
    setErrorEnvio(null);
    try {
      const resultado = await registrarCheckIn({
        reservacionId: contexto.reservacion.id,
        usuarioId: usuarioActivo.id,
        ubicacion: contexto.solicitud.origen,
        kilometrajeInicial: Number(kilometrajeInicial),
        combustibleInicial,
        fotos,
        firmaElectronica: firmaElectronica ?? "",
        responsivaAceptada,
        observaciones: observaciones.trim() || undefined,
      });

      if (esResultadoSinDatos(resultado)) {
        setErrorEnvio(resultado.detalle);
        return;
      }

      setEstado("exito");
    } catch (error) {
      setErrorEnvio(error instanceof Error ? error.message : "Ocurrió un error inesperado al registrar el check-in.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-28">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Check-in digital</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Recepción del vehículo</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Confirma tu identidad, revisa el vehículo asignado y registra el kilometraje, combustible, fotos y firma
            antes de salir.
          </p>
        </section>

        {estado === "cargando" && <LoadingState message="Preparando tu check-in..." />}

        {estado === "bloqueado" && (
          <ErrorState title="Check-in no disponible" description={mensajeBloqueo} action={<VolverAReservaciones />} />
        )}

        {estado === "exito" && contexto && (
          <section className="flex flex-col items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <h3 className="text-lg font-semibold text-emerald-900">Check-in confirmado</h3>
            <p className="max-w-md text-sm text-emerald-800">
              El folio {contexto.solicitud.folio} pasó a estado &quot;En curso&quot;. Buen viaje.
            </p>
            <VolverAReservaciones />
          </section>
        )}

        {estado === "listo" && contexto && usuarioActivo && (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <User className="h-4 w-4 text-slate-500" /> Identidad del colaborador
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <ShieldCheck className="h-8 w-8 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{usuarioActivo.nombreCompleto}</p>
                  <p className="text-xs text-slate-500">
                    {usuarioActivo.empleadoId} · {usuarioActivo.correoCorporativo}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Identidad confirmada automáticamente con tu sesión activa (simulado).
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Car className="h-4 w-4 text-slate-500" /> Vehículo asignado
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
                  <dt className="text-xs text-slate-500">Territorio</dt>
                  <dd className="font-medium text-slate-900">{contexto.territorioNombre}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-slate-500">
                    <Wrench className="h-3 w-3" /> Último mantenimiento
                  </dt>
                  <dd className="font-medium text-slate-900">
                    {contexto.ultimoMantenimiento
                      ? `${contexto.ultimoMantenimiento.tipoMantenimiento} · ${contexto.ultimoMantenimiento.fechaRealizada}`
                      : "Sin mantenimientos registrados"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Gauge className="h-4 w-4 text-slate-500" /> Kilometraje y combustible inicial
              </div>

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="kilometraje">Kilometraje inicial (km)</Label>
                <Input
                  id="kilometraje"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={kilometrajeInicial}
                  onChange={(e) => setKilometrajeInicial(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Último registrado: {contexto.vehiculo.kilometrajeActual.toLocaleString("es-MX")} km
                </p>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="combustible" className="flex items-center gap-1.5">
                    <Fuel className="h-3.5 w-3.5" /> Nivel de combustible inicial
                  </Label>
                  <span className="text-sm font-semibold text-slate-900">{combustibleInicial}%</span>
                </div>
                <input
                  id="combustible"
                  type="range"
                  min={CHECKIN_CONFIG.combustible.minimoPorcentaje}
                  max={CHECKIN_CONFIG.combustible.maximoPorcentaje}
                  step={5}
                  value={combustibleInicial}
                  onChange={(e) => setCombustibleInicial(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
                <div className="flex flex-wrap gap-2">
                  {PRESETS_COMBUSTIBLE.map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setCombustibleInicial(valor)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        combustibleInicial === valor
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
              <p className="text-sm font-semibold text-slate-900">Fotografías del vehículo</p>
              <div className="mt-3">
                <FotosUploader fotos={fotos} onFotosChange={setFotos} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-semibold text-slate-900">Responsiva</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Declaro haber recibido el vehículo descrito en condiciones operativas adecuadas, con el kilometraje y
                nivel de combustible aquí registrados, y me hago responsable de su uso, cuidado y resguardo durante el
                periodo de la reservación, conforme a las políticas de movilidad corporativa de Banorte.
              </p>
              <label className="mt-3 flex items-start gap-2.5">
                <Checkbox
                  checked={responsivaAceptada}
                  onCheckedChange={(checked) => setResponsivaAceptada(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-700">Acepto la responsiva</span>
              </label>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-semibold text-slate-900">Firma electrónica</p>
              <p className="mt-1 text-xs text-slate-500">
                Firmando como: {usuarioActivo.nombreCompleto} · {new Date().toLocaleDateString("es-MX")}
              </p>
              <div className="mt-3">
                <FirmaCanvas onFirmaChange={setFirmaElectronica} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                className="mt-1.5"
                rows={3}
                placeholder="Golpes, rayones u otras observaciones del vehículo..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </section>

            {errorEnvio && <ErrorState title="No se pudo registrar el check-in" description={errorEnvio} />}

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
              <div className="mx-auto max-w-3xl">
                {intentoEnviar && validacion && !validacion.valido && (
                  <ul className="mb-2 space-y-1 text-xs text-red-700">
                    {validacion.errores.map((error) => (
                      <li key={error}>• {error}</li>
                    ))}
                  </ul>
                )}
                <Button size="lg" className="w-full" onClick={confirmarRecepcion} disabled={enviando}>
                  {enviando ? "Registrando check-in..." : "Confirmar recepción"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function VolverAReservaciones() {
  return (
    <Button variant="outline" render={<Link href="/reservaciones" />} nativeButton={false}>
      Volver a Mis reservaciones
    </Button>
  );
}
