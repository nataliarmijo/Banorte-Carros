"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/states";
import { useNuevaSolicitudStore } from "@/lib/stores/nueva-solicitud";
import { useSessionStore } from "@/lib/stores/session";
import { evaluarAlternativasParaSolicitud, type EvaluacionAlternativas } from "@/lib/adapters/flota";
import { crearSolicitudDesdeWizard } from "@/lib/adapters/solicitudes";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { evaluarAprobacionEspecial } from "@/lib/services/servicio-comparador";
import { esResultadoSinDatos, type BorradorSolicitud } from "@/lib/services/types";
import { validarPaso1, type DatosPaso1Validados } from "../_lib/schema";
import { ALTERNATIVA_LABELS, combinarFechaHora, estimarDuracionMinutos, TERRITORIOS_OPCIONES, TIPO_VEHICULO_LABELS } from "../_lib/utils";

export function Paso3Confirmacion() {
  const { datos, alternativaSeleccionada, irAPaso, completarConExito } = useNuevaSolicitudStore();
  const { usuarioActivo } = useSessionStore();
  const [estadoCarga, setEstadoCarga] = useState<"cargando" | "listo" | "error">("cargando");
  const [mensajeErrorCarga, setMensajeErrorCarga] = useState("");
  const [evaluacion, setEvaluacion] = useState<EvaluacionAlternativas | null>(null);
  const [datosValidados, setDatosValidados] = useState<DatosPaso1Validados | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    const validado = validarPaso1(datos);
    if (!validado.exito) {
      irAPaso(1);
      return;
    }
    if (!alternativaSeleccionada) {
      irAPaso(2);
      return;
    }

    let cancelado = false;

    (async () => {
      const fechaSalida = combinarFechaHora(validado.datos.fechaSalida, validado.datos.horaSalida);
      const fechaRegreso = combinarFechaHora(validado.datos.fechaRegreso, validado.datos.horaRegreso);
      const duracionEstimadaMinutos = estimarDuracionMinutos(validado.datos.distanciaEstimadaKm);

      const evaluacionCalculada = await evaluarAlternativasParaSolicitud(
        {
          territorio: validado.datos.territorio,
          distanciaEstimadaKm: validado.datos.distanciaEstimadaKm,
          duracionEstimadaMinutos,
          fechaSalida,
          fechaRegreso,
          pasajeros: validado.datos.pasajeros,
          tipoVehiculoRequerido: validado.datos.tipoVehiculoRequerido,
        },
        PARAMS_CONFIG.limitesCostoEspecial.colaborador
      );

      if (cancelado) return;

      if (esResultadoSinDatos(evaluacionCalculada.resultado)) {
        setMensajeErrorCarga(evaluacionCalculada.resultado.detalle);
        setEstadoCarga("error");
        return;
      }

      setEvaluacion(evaluacionCalculada);
      setDatosValidados(validado.datos);
      setEstadoCarga("listo");
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (estadoCarga === "cargando") {
    return <LoadingState message="Preparando el resumen de tu solicitud..." />;
  }

  if (estadoCarga === "error" || !evaluacion || !datosValidados || esResultadoSinDatos(evaluacion.resultado) || !alternativaSeleccionada) {
    return (
      <div className="space-y-4">
        <ErrorState title="Sin datos suficientes" description={mensajeErrorCarga || "No fue posible preparar el resumen."} />
        <Button variant="outline" onClick={() => irAPaso(2)}>
          Volver a evaluación
        </Button>
      </div>
    );
  }

  const { resultado } = evaluacion;
  const alternativaElegida = resultado.alternativas.find((a) => a.tipo === alternativaSeleccionada)!;
  const costoMasCaro = Math.max(...resultado.alternativas.map((a) => a.costo.costoTotal));
  const ahorroFrenteAMasCaro = Math.max(0, costoMasCaro - alternativaElegida.costo.costoTotal);

  const fechaSalida = combinarFechaHora(datosValidados.fechaSalida, datosValidados.horaSalida);
  const fechaRegreso = combinarFechaHora(datosValidados.fechaRegreso, datosValidados.horaRegreso);
  const duracionEstimadaMinutos = estimarDuracionMinutos(datosValidados.distanciaEstimadaKm);

  const borrador: BorradorSolicitud = {
    territorioOrigen: datosValidados.territorio,
    territorioDestino: datosValidados.territorio,
    distanciaEstimadaKm: datosValidados.distanciaEstimadaKm,
    fecha: fechaSalida,
    horaEstimada: fechaSalida.getHours(),
    pasajeros: datosValidados.pasajeros,
    tipoVehiculoRequerido: datosValidados.tipoVehiculoRequerido,
    duracionEstimadaMinutos,
  };
  const { requiereAprobacionEspecial, motivoAprobacionEspecial } = evaluarAprobacionEspecial(
    borrador,
    alternativaElegida.costo.costoTotal,
    PARAMS_CONFIG.limitesCostoEspecial.colaborador
  );

  const territorioNombre = TERRITORIOS_OPCIONES.find((t) => t.id === datosValidados.territorio)?.nombre ?? datosValidados.territorio;

  async function confirmarEnvio() {
    if (!usuarioActivo || !datosValidados || !alternativaSeleccionada) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const resultadoEnvio = await crearSolicitudDesdeWizard({
        datos: datosValidados,
        fechaSalida,
        fechaRegreso,
        duracionEstimadaMinutos,
        alternativaSeleccionada,
        resultado,
        usuarioSolicitanteId: usuarioActivo.id,
        limiteCostoAprobacion: PARAMS_CONFIG.limitesCostoEspecial.colaborador,
      });
      completarConExito(resultadoEnvio);
    } catch (error) {
      setErrorEnvio(error instanceof Error ? error.message : "Ocurrió un error inesperado al enviar la solicitud.");
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Resumen del viaje</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Territorio</dt>
            <dd className="text-sm font-medium text-slate-900">{territorioNombre}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Ruta</dt>
            <dd className="text-sm font-medium text-slate-900">
              {datosValidados.origen} → {datosValidados.destino}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Salida</dt>
            <dd className="text-sm font-medium text-slate-900">
              {datosValidados.fechaSalida} {datosValidados.horaSalida}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Regreso</dt>
            <dd className="text-sm font-medium text-slate-900">
              {datosValidados.fechaRegreso} {datosValidados.horaRegreso}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Pasajeros</dt>
            <dd className="text-sm font-medium text-slate-900">{datosValidados.pasajeros}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Tipo de vehículo requerido</dt>
            <dd className="text-sm font-medium text-slate-900">{TIPO_VEHICULO_LABELS[datosValidados.tipoVehiculoRequerido]}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Distancia / duración</dt>
            <dd className="text-sm font-medium text-slate-900">
              {datosValidados.distanciaEstimadaKm} km · {duracionEstimadaMinutos} min
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Motivo</dt>
            <dd className="text-sm font-medium text-slate-900">{datosValidados.motivoViaje}</dd>
          </div>
          {datosValidados.necesidadesEspeciales && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Necesidades especiales</dt>
              <dd className="text-sm font-medium text-slate-900">{datosValidados.necesidadesEspeciales}</dd>
            </div>
          )}
          {datosValidados.transportaEquipo && (
            <div className="sm:col-span-2">
              <dd className="text-sm font-medium text-slate-900">Transporta equipo o materiales</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Medio elegido</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Alternativa</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{ALTERNATIVA_LABELS[alternativaSeleccionada]}</p>
            {alternativaElegida.vehiculoNombre && (
              <p className="text-xs text-slate-500">{alternativaElegida.vehiculoNombre}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">Costo estimado</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              ${Math.round(alternativaElegida.costo.costoTotal).toLocaleString("es-MX")} MXN
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Emisiones estimadas</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{alternativaElegida.emisiones.totalKgCo2.toFixed(1)} kg CO₂</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-emerald-50 p-3">
          <p className="text-sm text-emerald-800">
            {ahorroFrenteAMasCaro > 0
              ? `Ahorro estimado de $${Math.round(ahorroFrenteAMasCaro).toLocaleString("es-MX")} MXN frente a la alternativa más cara.`
              : "Esta es la alternativa de mayor costo entre las evaluadas."}
          </p>
        </div>
      </section>

      <section
        className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
          requiereAprobacionEspecial ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <div className="flex items-start gap-3">
          {requiereAprobacionEspecial ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {requiereAprobacionEspecial ? "Requiere aprobación especial" : "No requiere aprobación especial"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {requiereAprobacionEspecial
                ? `Política aplicada: ${motivoAprobacionEspecial}.`
                : "El viaje está dentro de política: horario laboral y costo dentro del límite configurado."}
            </p>
          </div>
        </div>
      </section>

      {errorEnvio && <ErrorState title="No se pudo enviar la solicitud" description={errorEnvio} />}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => irAPaso(2)} disabled={enviando}>
          Volver
        </Button>
        <Button size="lg" onClick={confirmarEnvio} disabled={enviando}>
          {enviando ? "Enviando..." : "Confirmar y enviar solicitud"}
        </Button>
      </div>
    </div>
  );
}
