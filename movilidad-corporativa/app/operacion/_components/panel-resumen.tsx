"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ResumenOperativo } from "@/lib/adapters/operacion";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import { SEVERIDAD_ESTILOS, SEVERIDAD_LABELS, TIPO_INCIDENCIA_LABELS } from "@/lib/ui/incidencias";
import { COLOR_ASIGNADO, COLOR_POOL } from "@/app/analitica/_lib/colores";
import { GraficoBarrasAgrupadas } from "@/app/analitica/_components/graficos";
import { SeccionCard, TablaSimple } from "@/app/analitica/_components/seccion-card";

function formatoMinutos(minutos: number | null): string {
  if (minutos === null) return "Sin datos suficientes";
  const signo = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  const horas = Math.floor(abs / 60);
  const resto = abs % 60;
  return `${signo}${horas > 0 ? `${horas}h ` : ""}${resto}min`;
}

function TarjetaStat({ etiqueta, valor, tono = "neutral" }: { etiqueta: string; valor: string; tono?: "neutral" | "alerta" | "critico" }) {
  const clases =
    tono === "critico" ? "bg-red-50 text-red-700" : tono === "alerta" ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-900";
  return (
    <div className={`rounded-2xl p-4 ${clases}`}>
      <p className="text-xs opacity-80">{etiqueta}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
    </div>
  );
}

export function PanelResumen({ resumen }: { resumen: ResumenOperativo }) {
  const [umbralMantenimiento, setUmbralMantenimiento] = useState(resumen.umbralMantenimientoDiasPorDefecto);

  const disponibilidadPorTerritorio = useMemo(() => {
    const mapa = new Map<string, { etiqueta: string; pool: number; asignado: number }>();
    for (const celda of resumen.disponibilidad) {
      const fila = mapa.get(celda.territorioId) ?? { etiqueta: celda.territorioNombre, pool: 0, asignado: 0 };
      if (celda.modalidad === "POOL") fila.pool = celda.disponibles;
      else fila.asignado = celda.disponibles;
      mapa.set(celda.territorioId, fila);
    }
    return Array.from(mapa.values());
  }, [resumen.disponibilidad]);

  const mantenimientosFiltrados = resumen.mantenimientosProximos.filter((m) => m.diasRestantes <= umbralMantenimiento);

  return (
    <div className="space-y-6">
      {/* 8. Alertas críticas */}
      {(resumen.alertas.incidenciasCriticas.length > 0 || resumen.alertas.esFueraDeHorarioAhora) && (
        <section className="space-y-3 rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4" /> Alertas críticas
          </div>
          {resumen.alertas.incidenciasCriticas.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-700">Incidencias críticas abiertas ({resumen.alertas.incidenciasCriticas.length})</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {resumen.alertas.incidenciasCriticas.map((i) => (
                  <li key={i.incidencia.id} className="rounded-xl border border-red-300 bg-white p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{TIPO_INCIDENCIA_LABELS[i.incidencia.tipoIncidencia]}</p>
                      <Badge className={SEVERIDAD_ESTILOS.CRITICA}>{SEVERIDAD_LABELS.CRITICA}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {i.vehiculo ? `${i.vehiculo.marca} ${i.vehiculo.modelo} (${i.vehiculo.placa})` : "Vehículo desconocido"} · {i.territorioNombre}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resumen.alertas.esFueraDeHorarioAhora && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-red-700">
                <Moon className="h-3.5 w-3.5" /> Fuera de horario laboral en este momento ({resumen.alertas.vehiculosFueraDeHorarioAhora.length} vehículo(s) en uso)
              </p>
              {resumen.alertas.vehiculosFueraDeHorarioAhora.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {resumen.alertas.vehiculosFueraDeHorarioAhora.map((v) => (
                    <li key={v.vehiculo.id} className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs text-slate-700">
                      {v.vehiculo.marca} {v.vehiculo.modelo} ({v.vehiculo.placa}) · {v.territorioNombre}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {/* 7. Tiempos promedio */}
      <SeccionCard titulo="Tiempos promedio del proceso" descripcion="Desde el registro hasta la decisión de aprobación, la entrega (check-in) y la recepción (check-out).">
        <div className="grid gap-4 sm:grid-cols-3">
          <TarjetaStat etiqueta="Aprobación" valor={formatoMinutos(resumen.tiempos.aprobacionMinutos)} />
          <TarjetaStat etiqueta="Entrega (check-in)" valor={formatoMinutos(resumen.tiempos.entregaMinutos)} />
          <TarjetaStat etiqueta="Recepción (check-out)" valor={formatoMinutos(resumen.tiempos.recepcionMinutos)} />
        </div>
      </SeccionCard>

      {/* 1. Disponibilidad actual */}
      <SeccionCard titulo="Disponibilidad actual de la flotilla" descripcion="Unidades disponibles ahora mismo, por territorio y modalidad.">
        {disponibilidadPorTerritorio.length > 0 ? (
          <GraficoBarrasAgrupadas
            datos={disponibilidadPorTerritorio}
            series={[
              { key: "pool", etiqueta: "Pool", color: COLOR_POOL },
              { key: "asignado", etiqueta: "Asignado", color: COLOR_ASIGNADO },
            ]}
            formatoValor={(v) => `${v}`}
          />
        ) : (
          <p className="text-sm text-slate-500">Sin datos suficientes.</p>
        )}
        <TablaSimple
          columnas={["Territorio", "Modalidad", "Disponibles", "Total"]}
          filas={resumen.disponibilidad.map((c) => [c.territorioNombre, MEDIO_LABELS[c.modalidad], String(c.disponibles), String(c.total)])}
        />
      </SeccionCard>

      {/* 2. Saturación territorial */}
      <SeccionCard titulo="Saturación territorial" descripcion="Territorios con más solicitudes en espera de vehículo que unidades Pool disponibles ahora mismo.">
        <TablaSimple
          columnas={["Territorio", "Solicitudes en espera", "Pool disponibles", "Estado"]}
          filas={resumen.saturacion.map((s) => [
            s.territorioNombre,
            String(s.solicitudesEnEspera),
            String(s.vehiculosPoolDisponibles),
            <Badge key={s.territorioId} variant={s.saturado ? "destructive" : "outline"}>
              {s.saturado ? "Saturado" : "Normal"}
            </Badge>,
          ])}
        />
      </SeccionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 3. Reservaciones próximas 24h */}
        <SeccionCard titulo="Reservaciones de las próximas 24 horas" descripcion="Salidas planeadas que aún no inician.">
          <TablaSimple
            columnas={["Folio", "Solicitante", "Territorio", "Vehículo", "Inicia en"]}
            filas={resumen.reservacionesProximas24h.map((r) => [
              r.folio,
              r.solicitanteNombre,
              r.territorioNombre,
              r.vehiculoNombre,
              formatoMinutos(r.minutosParaInicio),
            ])}
          />
        </SeccionCard>

        {/* 4. Devoluciones retrasadas */}
        <SeccionCard titulo="Devoluciones retrasadas" descripcion="Check-out vencido: la hora de regreso planeada ya pasó y el vehículo sigue en curso.">
          <TablaSimple
            columnas={["Folio", "Solicitante", "Vehículo", "Retraso"]}
            filas={resumen.devolucionesRetrasadas.map((f) => [
              f.solicitud.folio,
              f.solicitanteNombre,
              f.vehiculo ? `${f.vehiculo.marca} ${f.vehiculo.modelo} (${f.vehiculo.placa})` : "—",
              formatoMinutos(f.minutosRetraso),
            ])}
          />
        </SeccionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 5. Mantenimiento próximo */}
        <SeccionCard titulo="Mantenimiento próximo" descripcion="Unidades con mantenimiento programado (no realizado) por vencer.">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Ventana (días):
            <input
              type="number"
              min={1}
              max={90}
              value={umbralMantenimiento}
              onChange={(e) => setUmbralMantenimiento(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <TablaSimple
            columnas={["Vehículo", "Territorio", "Tipo", "Días restantes"]}
            filas={mantenimientosFiltrados.map((m) => [
              m.vehiculo ? `${m.vehiculo.marca} ${m.vehiculo.modelo} (${m.vehiculo.placa})` : "—",
              m.territorioNombre,
              m.mantenimiento.tipoMantenimiento.replace(/_/g, " "),
              m.diasRestantes < 0 ? `Vencido (${Math.abs(m.diasRestantes)} d)` : `${m.diasRestantes} d`,
            ])}
          />
        </SeccionCard>

        {/* 6. Solicitudes aprobadas sin vehículo asignado */}
        <SeccionCard titulo="Solicitudes aprobadas sin vehículo asignado" descripcion="El motor de asignación no encontró unidad o falló; requieren intervención manual.">
          {resumen.solicitudesSinAsignar.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" /> {resumen.solicitudesSinAsignar.length} solicitud(es) requieren atención
            </p>
          )}
          <TablaSimple
            columnas={["Folio", "Solicitante", "Territorio", "En espera"]}
            filas={resumen.solicitudesSinAsignar.map((s) => [
              s.solicitud.folio,
              s.solicitanteNombre,
              s.territorioNombre,
              `${s.horasEnEspera} h`,
            ])}
          />
        </SeccionCard>
      </div>
    </div>
  );
}
