"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeccionCard } from "@/app/analitica/_components/seccion-card";
import {
  guardarSeccionConfiguracion,
  listarDefinicionesSecciones,
  type ClaveSeccionConfig,
  type ValorEscenarioBaseAhorros,
  type ValorHorarioLaboral,
  type ValorMetasGerenciales,
} from "@/lib/config/runtime-config";
import { esResultadoSinDatos } from "@/lib/services/types";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import { TIPO_VEHICULO_LABELS } from "@/app/analitica/_lib/filtros";
import { CampoFormulario, FormularioCampos } from "./formulario-campos";

const DIAS_SEMANA = [
  { valor: 0, etiqueta: "Dom" },
  { valor: 1, etiqueta: "Lun" },
  { valor: 2, etiqueta: "Mar" },
  { valor: 3, etiqueta: "Mié" },
  { valor: 4, etiqueta: "Jue" },
  { valor: 5, etiqueta: "Vie" },
  { valor: 6, etiqueta: "Sáb" },
];

const TIPOS_VEHICULO_COSTOS = ["sedan-compacto", "sedan-ejecutivo", "suv-asignado"] as const;

const CAMPOS: Partial<Record<ClaveSeccionConfig, CampoFormulario[]>> = {
  limitesCostoEspecial: [
    { ruta: "colaborador", etiqueta: "Límite Colaborador (MXN)" },
    { ruta: "aprobador", etiqueta: "Límite Aprobador (MXN)" },
    { ruta: "ejecutivo", etiqueta: "Límite Ejecutivo (MXN)" },
  ],
  asignacionPesos: [
    { ruta: "compatibilidad", etiqueta: "Compatibilidad", paso: "0.01" },
    { ruta: "proximidad", etiqueta: "Proximidad", paso: "0.01" },
    { ruta: "utilizacion", etiqueta: "Utilización reciente", paso: "0.01" },
    { ruta: "balanceKilometraje", etiqueta: "Balance de kilometraje", paso: "0.01" },
    { ruta: "riesgoMantenimiento", etiqueta: "Riesgo de mantenimiento", paso: "0.01" },
    { ruta: "incidencias", etiqueta: "Ausencia de incidencias", paso: "0.01" },
  ],
  uberConfig: [
    { ruta: "tarifaBase", etiqueta: "Tarifa base (MXN)" },
    { ruta: "costoKm", etiqueta: "Costo por km (MXN)" },
    { ruta: "costoMinuto", etiqueta: "Costo por minuto (MXN)" },
    { ruta: "costoAdministrativoManual", etiqueta: "Costo administrativo manual (MXN)" },
    { ruta: "supuestoCasetas", etiqueta: "Casetas promedio (MXN)" },
    { ruta: "factorDemanda.horarioNormal", etiqueta: "Factor horario normal", paso: "0.01" },
    { ruta: "factorDemanda.horarioPico", etiqueta: "Factor horario pico", paso: "0.01" },
    { ruta: "factorDemanda.finDeSemana", etiqueta: "Factor fin de semana", paso: "0.01" },
  ],
  costosVehiculos: TIPOS_VEHICULO_COSTOS.flatMap((tipo) => [
    { ruta: `${tipo}.rendimientoKmLitro`, etiqueta: `${TIPO_VEHICULO_LABELS[tipo]} · Rendimiento (km/l)` },
    { ruta: `${tipo}.precioCombustibleLitro`, etiqueta: `${TIPO_VEHICULO_LABELS[tipo]} · Precio combustible (MXN/l)` },
    { ruta: `${tipo}.costoMantenimientoKm`, etiqueta: `${TIPO_VEHICULO_LABELS[tipo]} · Mantenimiento (MXN/km)` },
    { ruta: `${tipo}.costoSeguroMensual`, etiqueta: `${TIPO_VEHICULO_LABELS[tipo]} · Seguro (MXN/mes)` },
    { ruta: `${tipo}.costoDepreciacionMensual`, etiqueta: `${TIPO_VEHICULO_LABELS[tipo]} · Depreciación (MXN/mes)` },
    { ruta: `${tipo}.costoDesgasteMensual`, etiqueta: `${TIPO_VEHICULO_LABELS[tipo]} · Desgaste (MXN/mes)` },
    { ruta: `${tipo}.costoAdministrativoMensual`, etiqueta: `${TIPO_VEHICULO_LABELS[tipo]} · Administrativo (MXN/mes)` },
    { ruta: `${tipo}.costoEntregaRecepcionHora`, etiqueta: `${TIPO_VEHICULO_LABELS[tipo]} · Entrega/recepción (MXN/h)` },
  ]),
  emisionesConfig: [
    { ruta: "combustibles.GASOLINA.gCO2PorLitro", etiqueta: "Gasolina (g CO₂/litro)" },
    { ruta: "combustibles.DIESEL.gCO2PorLitro", etiqueta: "Diésel (g CO₂/litro)" },
    { ruta: "combustibles.ELECTRICO.gCO2PorKm", etiqueta: "Eléctrico (g CO₂/km)" },
    { ruta: "combustibles.HIBRIDO.gCO2PorLitro", etiqueta: "Híbrido (g CO₂/litro)" },
    { ruta: "combustibles.HIBRIDO.gCO2PorKm", etiqueta: "Híbrido, modo eléctrico (g CO₂/km)" },
    { ruta: "combustibles.HIBRIDO.porcentajeElectrico", etiqueta: "Híbrido, % tiempo eléctrico", paso: "0.01" },
    { ruta: "multiplicadoresPorTipo.sedan-compacto", etiqueta: "Multiplicador sedán compacto", paso: "0.01" },
    { ruta: "multiplicadoresPorTipo.sedan-ejecutivo", etiqueta: "Multiplicador sedán ejecutivo", paso: "0.01" },
    { ruta: "multiplicadoresPorTipo.suv-asignado", etiqueta: "Multiplicador SUV", paso: "0.01" },
    { ruta: "uber.gCO2PorKm", etiqueta: "Uber (g CO₂/km)" },
    { ruta: "escenarioBase.gCO2PorKm", etiqueta: "Escenario base -todo Uber- (g CO₂/km)" },
  ],
  analiticaMetas: [
    { ruta: "metaFlotaTotalUnidades", etiqueta: "Meta de unidades totales" },
    { ruta: "metaPoolPorcentaje", etiqueta: "Meta % Pool" },
    { ruta: "metaAsignadoPorcentaje", etiqueta: "Meta % Asignado" },
    { ruta: "metaUtilizacionPorDefecto", etiqueta: "Meta utilización por defecto (%)" },
    { ruta: "utilizacion.minimoViajesPorMes", etiqueta: "Mínimo viajes/mes (subutilizado)" },
    { ruta: "utilizacion.maximoViajesPorMes", etiqueta: "Máximo viajes/mes (sobreutilizado)" },
    { ruta: "metaTasaAprobacionPorcentaje", etiqueta: "Meta tasa de aprobación (%)" },
    { ruta: "metaMaximaUsoFueraDeHorarioPorcentaje", etiqueta: "Máximo uso fuera de horario (%)" },
    { ruta: "metaMaximaIncidenciasPorCadaCienViajes", etiqueta: "Máximo incidencias/100 viajes" },
    { ruta: "costoImplementacionEstimadoMx", etiqueta: "Costo de implementación estimado (MXN)" },
    { ruta: "horasAhorradasPorViajeDigitalizado", etiqueta: "Horas ahorradas por viaje", paso: "0.01" },
    { ruta: "mesesHistoricos", etiqueta: "Meses de histórico" },
  ],
  checkinConfig: [
    { ruta: "ventanaPreviaHoras", etiqueta: "Ventana previa habilitada (horas)" },
    { ruta: "kilometrajeExcedenteRazonableKm", etiqueta: "Kilometraje excedente razonable (km)" },
    { ruta: "combustible.minimoPorcentaje", etiqueta: "Combustible mínimo (%)" },
    { ruta: "combustible.maximoPorcentaje", etiqueta: "Combustible máximo (%)" },
    { ruta: "fotosMinimas", etiqueta: "Fotos mínimas al recoger" },
  ],
  checkoutConfig: [
    { ruta: "fotosMinimas", etiqueta: "Fotos mínimas al devolver" },
    { ruta: "consumoEsperadoPorcentajePor100Km", etiqueta: "Consumo esperado (% tanque / 100km)" },
  ],
  parametrosGenerales: [
    { ruta: "porcentajeTolerancia", etiqueta: "Tolerancia de comparación de costos", paso: "0.01" },
    { ruta: "margenUberRecomendacion", etiqueta: "Margen mínimo para recomendar Uber", paso: "0.01" },
    { ruta: "casetas.porcentajePorKm", etiqueta: "Casetas (% del costo/km)", paso: "0.01" },
    { ruta: "casetas.minimo", etiqueta: "Casetas mínimo (MXN)" },
    { ruta: "estacionamiento.costoPorMinuto", etiqueta: "Estacionamiento (MXN/min)" },
    { ruta: "estacionamiento.minutosEstimadosPorDefecto", etiqueta: "Minutos estimados de estacionamiento" },
    { ruta: "entregaRecepcion.minutosEstimados", etiqueta: "Minutos de entrega/recepción" },
    { ruta: "duracionEstimadaMinutosPorDefecto", etiqueta: "Duración estimada por defecto (min)" },
    { ruta: "umbralUrgenciaAprobacionHoras", etiqueta: "Horas para marcar una solicitud urgente" },
    { ruta: "saturacionFlotilla.umbralAltoPorcentaje", etiqueta: "Umbral \"flotilla saturada\" (%)" },
    { ruta: "saturacionFlotilla.umbralModeradoPorcentaje", etiqueta: "Umbral \"demanda moderada\" (%)" },
  ],
};

interface FormularioProps<T> {
  valorInicial: T;
  soloLectura: boolean;
  guardando: boolean;
  error: string | null;
  exito: boolean;
  onGuardar: (valor: T) => void;
}

function FormularioHorarioLaboral({ valorInicial, soloLectura, guardando, error, exito, onGuardar }: FormularioProps<ValorHorarioLaboral>) {
  const [borrador, setBorrador] = useState<ValorHorarioLaboral>(() => JSON.parse(JSON.stringify(valorInicial)));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar(borrador);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Hora de inicio (0-23)</Label>
          <Input type="number" min={0} max={23} disabled={soloLectura} value={borrador.horaInicio} onChange={(e) => setBorrador({ ...borrador, horaInicio: Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Hora de fin (0-23)</Label>
          <Input type="number" min={0} max={23} disabled={soloLectura} value={borrador.horaFin} onChange={(e) => setBorrador({ ...borrador, horaFin: Number(e.target.value) })} />
        </div>
      </div>
      <div>
        <Label className="text-xs text-slate-600">Días laborales</Label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {DIAS_SEMANA.map((dia) => (
            <label key={dia.valor} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
              <Checkbox
                checked={borrador.diasLaborales.includes(dia.valor)}
                disabled={soloLectura}
                onCheckedChange={(checked) => {
                  const nuevos = checked === true ? [...borrador.diasLaborales, dia.valor].sort((a, b) => a - b) : borrador.diasLaborales.filter((d) => d !== dia.valor);
                  setBorrador({ ...borrador, diasLaborales: nuevos });
                }}
              />
              {dia.etiqueta}
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {exito && !error && <p className="text-xs text-emerald-600">Cambios guardados.</p>}
      {!soloLectura && (
        <Button type="submit" size="sm" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </Button>
      )}
    </form>
  );
}

function FormularioEscenarioBase({ valorInicial, soloLectura, guardando, error, exito, onGuardar }: FormularioProps<ValorEscenarioBaseAhorros>) {
  const [borrador, setBorrador] = useState<ValorEscenarioBaseAhorros>(() => JSON.parse(JSON.stringify(valorInicial)));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar(borrador);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Modalidad por defecto</Label>
          <Select value={borrador.modalidadPorDefecto} onValueChange={(v) => v && setBorrador({ ...borrador, modalidadPorDefecto: v as "POOL" | "ASIGNADO" })} disabled={soloLectura}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="POOL">{MEDIO_LABELS.POOL}</SelectItem>
              <SelectItem value="ASIGNADO">{MEDIO_LABELS.ASIGNADO}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Tipo de vehículo por defecto</Label>
          <Select value={borrador.tipoVehiculoPorDefecto} onValueChange={(v) => v && setBorrador({ ...borrador, tipoVehiculoPorDefecto: v as ValorEscenarioBaseAhorros["tipoVehiculoPorDefecto"] })} disabled={soloLectura}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_VEHICULO_COSTOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_VEHICULO_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-slate-700">
        <Checkbox checked={borrador.incluyeCoordinacionManual} disabled={soloLectura} onCheckedChange={(checked) => setBorrador({ ...borrador, incluyeCoordinacionManual: checked === true })} />
        Incluye costo de coordinación manual en el escenario base
      </label>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Descripción</Label>
        <Textarea value={borrador.descripcion} disabled={soloLectura} onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {exito && !error && <p className="text-xs text-emerald-600">Cambios guardados.</p>}
      {!soloLectura && (
        <Button type="submit" size="sm" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </Button>
      )}
    </form>
  );
}

function FormularioMetasGerenciales({ valorInicial, soloLectura, guardando, error, exito, onGuardar }: FormularioProps<ValorMetasGerenciales>) {
  const [borrador, setBorrador] = useState<ValorMetasGerenciales>(() => JSON.parse(JSON.stringify(valorInicial)));

  function actualizarFila(indice: number, patch: Partial<ValorMetasGerenciales[number]>) {
    setBorrador(borrador.map((fila, i) => (i === indice ? { ...fila, ...patch } : fila)));
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar(borrador);
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
              <th className="py-2 pr-3">Territorio</th>
              <th className="py-2 pr-3">Meta utilización (%)</th>
              <th className="py-2 pr-3">Meta % Pool</th>
              <th className="py-2 pr-3">Meta ahorro mensual (MXN)</th>
              {!soloLectura && <th className="py-2 pr-3" />}
            </tr>
          </thead>
          <tbody>
            {borrador.map((fila, i) => (
              <tr key={fila.territorio} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 pr-3">
                  <Input value={fila.territorio} disabled={soloLectura} onChange={(e) => actualizarFila(i, { territorio: e.target.value })} />
                </td>
                <td className="py-1.5 pr-3">
                  <Input type="number" value={fila.metaUtilizacion} disabled={soloLectura} onChange={(e) => actualizarFila(i, { metaUtilizacion: Number(e.target.value) })} />
                </td>
                <td className="py-1.5 pr-3">
                  <Input type="number" value={fila.metaPoolPct} disabled={soloLectura} onChange={(e) => actualizarFila(i, { metaPoolPct: Number(e.target.value) })} />
                </td>
                <td className="py-1.5 pr-3">
                  <Input type="number" value={fila.metaAhorroMensualMx} disabled={soloLectura} onChange={(e) => actualizarFila(i, { metaAhorroMensualMx: Number(e.target.value) })} />
                </td>
                {!soloLectura && (
                  <td className="py-1.5 pr-3">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setBorrador(borrador.filter((_, idx) => idx !== i))}>
                      Quitar
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!soloLectura && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setBorrador([...borrador, { territorio: "", metaUtilizacion: 70, metaPoolPct: 60, metaAhorroMensualMx: 0 }])}
        >
          Agregar territorio
        </Button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {exito && !error && <p className="text-xs text-emerald-600">Cambios guardados.</p>}
      {!soloLectura && (
        <div>
          <Button type="submit" size="sm" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      )}
    </form>
  );
}

interface SeccionParametroProps {
  clave: ClaveSeccionConfig;
  titulo: string;
  descripcion: string;
  obtenerActual: () => unknown;
  soloLectura: boolean;
  usuarioId: string;
  onGuardado: () => void;
}

function SeccionParametro({ clave, titulo, descripcion, obtenerActual, soloLectura, usuarioId, onGuardado }: SeccionParametroProps) {
  const [valor, setValor] = useState(obtenerActual);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  // Se usa para forzar el remount del formulario (y así su estado local) tras un guardado exitoso.
  const [version, setVersion] = useState(0);

  async function guardar(nuevoValor: unknown) {
    setGuardando(true);
    setError(null);
    setExito(false);
    const resultado = await guardarSeccionConfiguracion(clave, nuevoValor, usuarioId);
    setGuardando(false);
    if (esResultadoSinDatos(resultado)) {
      setError(resultado.detalle);
      return;
    }
    setValor(obtenerActual());
    setExito(true);
    setVersion((v) => v + 1);
    onGuardado();
  }

  const campos = CAMPOS[clave];

  return (
    <SeccionCard titulo={titulo} descripcion={descripcion}>
      {clave === "horarioLaboral" && (
        <FormularioHorarioLaboral key={version} valorInicial={valor as ValorHorarioLaboral} soloLectura={soloLectura} guardando={guardando} error={error} exito={exito} onGuardar={guardar} />
      )}
      {clave === "escenarioBaseAhorros" && (
        <FormularioEscenarioBase key={version} valorInicial={valor as ValorEscenarioBaseAhorros} soloLectura={soloLectura} guardando={guardando} error={error} exito={exito} onGuardar={guardar} />
      )}
      {clave === "metasGerenciales" && (
        <FormularioMetasGerenciales key={version} valorInicial={valor as ValorMetasGerenciales} soloLectura={soloLectura} guardando={guardando} error={error} exito={exito} onGuardar={guardar} />
      )}
      {campos && (
        <FormularioCampos key={version} valorInicial={valor} campos={campos} soloLectura={soloLectura} guardando={guardando} error={error} exito={exito} onGuardar={guardar} />
      )}
    </SeccionCard>
  );
}

export function TabParametros({ soloLectura, usuarioId, onGuardado }: { soloLectura: boolean; usuarioId: string; onGuardado: () => void }) {
  const definiciones = listarDefinicionesSecciones().filter((d) => d.clave !== "territorios");

  return (
    <div className="space-y-6">
      {soloLectura && (
        <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
          Estás viendo estos parámetros en modo de solo lectura (rol Ejecutivo/Gerente). Sólo Administrador de flota puede editarlos.
        </p>
      )}
      {definiciones.map((definicion) => (
        <SeccionParametro
          key={definicion.clave}
          clave={definicion.clave}
          titulo={definicion.titulo}
          descripcion={definicion.descripcion}
          obtenerActual={definicion.obtenerActual}
          soloLectura={soloLectura}
          usuarioId={usuarioId}
          onGuardado={onGuardado}
        />
      ))}
    </div>
  );
}
