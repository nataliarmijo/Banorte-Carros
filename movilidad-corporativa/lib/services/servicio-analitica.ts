/**
 * servicioAnalitica
 * Cálculos puros del dashboard ejecutivo /analitica: KPIs con periodo actual
 * vs. anterior y meta, composición Pool/Asignado, costo por km por
 * alternativa, utilización de flotilla, ahorro económico (reusa
 * servicioAhorros), emisiones evitadas (reusa servicioEmisiones vía los
 * campos ya calculados en RegistroViaje), rankings/matriz comparativa, y el
 * motor de recomendaciones (reglas sobre datos reales, no texto genérico).
 *
 * Sin dependencias de Dexie ni de UI: el adaptador (/lib/adapters/analitica)
 * construye `RegistroViaje[]` a partir de la base de datos y llama a estas
 * funciones.
 */

import { PARAMS_CONFIG } from "@/lib/config/params";
import { EMISIONES_CONFIG } from "@/lib/config/emisiones";
import { ANALITICA_CONFIG } from "@/lib/config/analitica";
import { calcularComposicionFlotilla, type ComposicionFlotilla } from "./servicio-flota";
import { calcularAhorros, type ViajeParaAhorro } from "./servicio-ahorros";
import { calcularIncidenciasPorCadaCienViajes } from "./servicio-incidencias";
import { esResultadoSinDatos } from "./types";
import type { Alternativa, ResultadoAhorros, ResultadoSinDatos, TipoVehiculo } from "./types";
import type { TipoCombustible } from "@/lib/config/costos";
import type { EstadoSolicitud, ModalidadVehiculo, NivelPrioridad, TipoIncidencia } from "@/lib/models";

// ---------------------------------------------------------------------------
// Registro central: una fila por solicitud, enriquecida por el adaptador con
// los datos de vehículo/reservación/check-out cuando existen. Es la unidad
// que filtran los 8 filtros globales del dashboard.
// ---------------------------------------------------------------------------
export interface RegistroViaje {
  solicitudId: string;
  reservacionId?: string;
  vehiculoId?: string;
  /** Fecha de referencia para bucketing mensual y filtro de periodo (fecha de la solicitud). */
  fecha: Date;
  territorioId: string;
  area?: string;
  tipoViaje: string;
  /** "Medio de transporte": alternativa solicitada (Solicitud.modalidadRequerida), incluye UBER. */
  modalidadRequerida: ModalidadVehiculo;
  /** "Modalidad": modalidad del vehículo de flotilla asignado; undefined si no hubo vehículo de flotilla (p.ej. Uber). */
  modalidadVehiculo?: ModalidadVehiculo;
  tipoVehiculo?: TipoVehiculo;
  tipoCombustible?: TipoCombustible;
  estadoSolicitud: EstadoSolicitud;
  /** true si la reservación asociada llegó a estado COMPLETADA. */
  completado: boolean;
  distanciaKm: number;
  /** Costo real (si completado, del check-out) o estimado (de la solicitud) en MXN. */
  costoMxn: number;
  esEstimadoCosto: boolean;
  emisionesGramos: number;
  co2EvitadoGramos: number;
  fueraDeHorario: boolean;
  finDeSemana: boolean;
}

export interface FiltrosAnalitica {
  periodoInicio?: Date;
  /** Exclusivo: un registro con fecha === periodoFin queda fuera. */
  periodoFin?: Date;
  territorioIds?: string[];
  modalidades?: ModalidadVehiculo[];
  tiposVehiculo?: TipoVehiculo[];
  combustibles?: TipoCombustible[];
  mediosTransporte?: ModalidadVehiculo[];
  areas?: string[];
  tiposViaje?: string[];
}

function obtenerAlternativa(registro: RegistroViaje): Alternativa {
  if (registro.modalidadVehiculo === "POOL") return "POOL";
  if (registro.modalidadVehiculo === "ASIGNADO") return "ASIGNADO";
  return "UBER";
}

/** Aplica los 8 filtros globales del dashboard sobre el conjunto de registros. */
export function filtrarRegistros(registros: RegistroViaje[], filtros: FiltrosAnalitica): RegistroViaje[] {
  return registros.filter((r) => {
    if (filtros.periodoInicio && r.fecha.getTime() < filtros.periodoInicio.getTime()) return false;
    if (filtros.periodoFin && r.fecha.getTime() >= filtros.periodoFin.getTime()) return false;
    if (filtros.territorioIds && filtros.territorioIds.length > 0 && !filtros.territorioIds.includes(r.territorioId)) return false;
    if (filtros.modalidades && filtros.modalidades.length > 0 && (!r.modalidadVehiculo || !filtros.modalidades.includes(r.modalidadVehiculo))) return false;
    if (filtros.tiposVehiculo && filtros.tiposVehiculo.length > 0 && (!r.tipoVehiculo || !filtros.tiposVehiculo.includes(r.tipoVehiculo))) return false;
    if (filtros.combustibles && filtros.combustibles.length > 0 && (!r.tipoCombustible || !filtros.combustibles.includes(r.tipoCombustible))) return false;
    if (filtros.mediosTransporte && filtros.mediosTransporte.length > 0 && !filtros.mediosTransporte.includes(r.modalidadRequerida)) return false;
    if (filtros.areas && filtros.areas.length > 0 && (!r.area || !filtros.areas.includes(r.area))) return false;
    if (filtros.tiposViaje && filtros.tiposViaje.length > 0 && !filtros.tiposViaje.includes(r.tipoViaje)) return false;
    return true;
  });
}

/** Ventana inmediatamente anterior, de la misma duración que [inicio, fin). */
export function calcularVentanaAnterior(inicio: Date, fin: Date): { inicio: Date; fin: Date } {
  const duracionMs = Math.max(0, fin.getTime() - inicio.getTime());
  return { inicio: new Date(inicio.getTime() - duracionMs), fin: new Date(inicio.getTime()) };
}

/** Duración de un periodo expresada en meses de 30 días (para escalar umbrales mensuales). Mínimo 1/30 para evitar división entre 0. */
export function calcularMesesEnPeriodo(inicio: Date, fin: Date): number {
  const dias = (fin.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(1 / 30, dias / 30);
}

// ---------------------------------------------------------------------------
// Helpers genéricos
// ---------------------------------------------------------------------------
function redondear(valor: number, decimales = 1): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

function sumaPor<T>(items: T[], obtenerValor: (item: T) => number): number {
  return items.reduce((total, item) => total + obtenerValor(item), 0);
}

function promedio(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return redondear(sumaPor(valores, (v) => v), 1);
}

function agruparPorClave<T, K extends string>(items: T[], obtenerClave: (item: T) => K): Map<K, T[]> {
  const mapa = new Map<K, T[]>();
  for (const item of items) {
    const clave = obtenerClave(item);
    const grupo = mapa.get(clave);
    if (grupo) grupo.push(item);
    else mapa.set(clave, [item]);
  }
  return mapa;
}

function claveMes(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

function etiquetaMes(anioMes: string): string {
  const [anio, mes] = anioMes.split("-").map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
}

/** Bucketiza una lista en los últimos `meses` meses (terminando en el mes de `ahora`, incluido), en orden cronológico. */
export function construirSerieMensual<T, R extends Record<string, unknown>>(
  registros: T[],
  obtenerFecha: (item: T) => Date,
  meses: number,
  ahora: Date,
  calcularValor: (grupo: T[]) => R
): Array<{ anioMes: string; etiqueta: string } & R> {
  const buckets = new Map<string, T[]>();
  for (let i = meses - 1; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    buckets.set(claveMes(fecha), []);
  }
  for (const item of registros) {
    const grupo = buckets.get(claveMes(obtenerFecha(item)));
    if (grupo) grupo.push(item);
  }
  return Array.from(buckets.entries()).map(([anioMes, grupo]) => ({
    anioMes,
    etiqueta: etiquetaMes(anioMes),
    ...calcularValor(grupo),
  }));
}

function nombreTerritorio(territorioId: string): string {
  return PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios]?.nombre ?? territorioId;
}

// ---------------------------------------------------------------------------
// KPIs principales (requisito 2)
// ---------------------------------------------------------------------------
export interface TarjetaKpi {
  id: string;
  etiqueta: string;
  unidad: "numero" | "porcentaje" | "mxn" | "horas";
  valorActual: number;
  valorAnterior: number | null;
  meta: number | null;
  direccionMeta?: "MINIMO" | "MAXIMO";
  /** true si un valor menor es mejor (para colorear la variación en la UI). */
  menorEsMejor: boolean;
  variacionPorcentaje: number | null;
  formula: string;
  sinDatosAnterior: boolean;
}

export interface VehiculoParaUtilizacion {
  id: string;
  nombre: string;
  territorioId: string;
  modalidad: ModalidadVehiculo;
}

export interface DatosPeriodoAnalitica {
  registros: RegistroViaje[];
  incidencias: { tipoIncidencia: TipoIncidencia }[];
}

const ESTADOS_APROBADOS_O_MAS = new Set<EstadoSolicitud>([
  "APROBADA",
  "ASIGNADA",
  "LISTA_CHECK_IN",
  "EN_CURSO",
  "COMPLETADA",
]);

export function calcularVariacionPorcentaje(actual: number, anterior: number | null): number | null {
  if (anterior === null || anterior === 0) return null;
  return redondear(((actual - anterior) / Math.abs(anterior)) * 100, 1);
}

export interface UtilizacionVehiculo {
  vehiculoId: string;
  nombre: string;
  territorioId: string;
  modalidad: ModalidadVehiculo;
  viajes: number;
  utilizacionPorcentaje: number;
  clasificacion: "SUBUTILIZADO" | "NORMAL" | "SOBREUTILIZADO";
}

export interface ResumenUtilizacionFlotilla {
  porVehiculo: UtilizacionVehiculo[];
  subutilizados: number;
  sobreutilizados: number;
  promedioPoolPorcentaje: number | null;
  promedioAsignadoPorcentaje: number | null;
}

/**
 * Utilización por vehículo: viajes completados en el periodo ÷ capacidad
 * configurada (viajes/mes máximos, escalada a la duración del periodo),
 * acotado a 100%. Clasifica sub/sobreutilizados contra los umbrales de
 * ANALITICA_CONFIG.utilizacion, también escalados al periodo.
 */
export function calcularUtilizacionFlotilla(
  vehiculos: VehiculoParaUtilizacion[],
  registrosCompletadosFlotilla: RegistroViaje[],
  mesesEnPeriodo: number
): ResumenUtilizacionFlotilla {
  const capacidadPeriodo = ANALITICA_CONFIG.utilizacion.maximoViajesPorMes * mesesEnPeriodo;
  const minimoPeriodo = ANALITICA_CONFIG.utilizacion.minimoViajesPorMes * mesesEnPeriodo;

  const viajesPorVehiculo = new Map<string, number>();
  for (const r of registrosCompletadosFlotilla) {
    if (!r.vehiculoId) continue;
    viajesPorVehiculo.set(r.vehiculoId, (viajesPorVehiculo.get(r.vehiculoId) ?? 0) + 1);
  }

  const porVehiculo: UtilizacionVehiculo[] = vehiculos.map((v) => {
    const viajes = viajesPorVehiculo.get(v.id) ?? 0;
    const utilizacionPorcentaje = capacidadPeriodo > 0 ? redondear(Math.min(100, (viajes / capacidadPeriodo) * 100), 1) : 0;
    const clasificacion: UtilizacionVehiculo["clasificacion"] =
      viajes < minimoPeriodo ? "SUBUTILIZADO" : viajes > capacidadPeriodo ? "SOBREUTILIZADO" : "NORMAL";
    return { vehiculoId: v.id, nombre: v.nombre, territorioId: v.territorioId, modalidad: v.modalidad, viajes, utilizacionPorcentaje, clasificacion };
  });

  const pool = porVehiculo.filter((v) => v.modalidad === "POOL");
  const asignado = porVehiculo.filter((v) => v.modalidad === "ASIGNADO");

  return {
    porVehiculo,
    subutilizados: porVehiculo.filter((v) => v.clasificacion === "SUBUTILIZADO").length,
    sobreutilizados: porVehiculo.filter((v) => v.clasificacion === "SOBREUTILIZADO").length,
    promedioPoolPorcentaje: promedio(pool.map((v) => v.utilizacionPorcentaje)),
    promedioAsignadoPorcentaje: promedio(asignado.map((v) => v.utilizacionPorcentaje)),
  };
}

/** Utilización de flotilla agrupada por territorio (misma fórmula, un grupo por territorio). */
export function calcularUtilizacionPorTerritorio(
  vehiculos: VehiculoParaUtilizacion[],
  registrosCompletadosFlotilla: RegistroViaje[],
  mesesEnPeriodo: number
): { territorioId: string; utilizacionPromedio: number | null; subutilizados: number; sobreutilizados: number }[] {
  const territorios = Array.from(new Set(vehiculos.map((v) => v.territorioId)));
  return territorios.map((territorioId) => {
    const vehiculosTerritorio = vehiculos.filter((v) => v.territorioId === territorioId);
    const registrosTerritorio = registrosCompletadosFlotilla.filter((r) => r.territorioId === territorioId);
    const resumen = calcularUtilizacionFlotilla(vehiculosTerritorio, registrosTerritorio, mesesEnPeriodo);
    return {
      territorioId,
      utilizacionPromedio: promedio(resumen.porVehiculo.map((v) => v.utilizacionPorcentaje)),
      subutilizados: resumen.subutilizados,
      sobreutilizados: resumen.sobreutilizados,
    };
  });
}

interface CifrasPeriodo {
  totalUnidades: number;
  poolPorcentaje: number | null;
  asignadoPorcentaje: number | null;
  utilizacionPromedio: number | null;
  reservasTotales: number;
  viajesCompletados: number;
  tasaAprobacion: number | null;
  costoTotalMovilidad: number;
  horasAhorradas: number;
  vehiculosSubutilizados: number;
  usoFueraDeHorarioPorcentaje: number | null;
  incidenciasPor100: number;
}

function calcularCifrasPeriodo(
  vehiculosFlota: VehiculoParaUtilizacion[],
  datos: DatosPeriodoAnalitica,
  mesesEnPeriodo: number
): CifrasPeriodo {
  const composicion = calcularComposicionFlotilla(vehiculosFlota);
  const completados = datos.registros.filter((r) => r.completado);
  const reservas = datos.registros.filter((r) => r.reservacionId);
  const aprobadasOMas = datos.registros.filter((r) => ESTADOS_APROBADOS_O_MAS.has(r.estadoSolicitud));
  const rechazadas = datos.registros.filter((r) => r.estadoSolicitud === "RECHAZADA");
  const completadosFlotilla = completados.filter((r) => r.vehiculoId);

  const utilizacion = calcularUtilizacionFlotilla(vehiculosFlota, completadosFlotilla, mesesEnPeriodo);
  const { tasaPorCadaCienViajes } = calcularIncidenciasPorCadaCienViajes(datos.incidencias.length, completados.length);

  return {
    totalUnidades: composicion.totalFlota,
    poolPorcentaje: composicion.totalFlota > 0 ? composicion.poolPorcentaje : null,
    asignadoPorcentaje: composicion.totalFlota > 0 ? composicion.asignadoPorcentaje : null,
    utilizacionPromedio: promedio(utilizacion.porVehiculo.map((v) => v.utilizacionPorcentaje)),
    reservasTotales: reservas.length,
    viajesCompletados: completados.length,
    tasaAprobacion:
      aprobadasOMas.length + rechazadas.length > 0
        ? redondear((aprobadasOMas.length / (aprobadasOMas.length + rechazadas.length)) * 100, 1)
        : null,
    costoTotalMovilidad: redondear(sumaPor(completados, (r) => r.costoMxn), 2),
    horasAhorradas: redondear(completados.length * ANALITICA_CONFIG.horasAhorradasPorViajeDigitalizado, 1),
    vehiculosSubutilizados: utilizacion.subutilizados,
    usoFueraDeHorarioPorcentaje:
      completados.length > 0 ? redondear((completados.filter((r) => r.fueraDeHorario).length / completados.length) * 100, 1) : null,
    incidenciasPor100: tasaPorCadaCienViajes,
  };
}

export interface ParametrosKpisPrincipales {
  vehiculosFlota: VehiculoParaUtilizacion[];
  actual: DatosPeriodoAnalitica;
  /** null cuando no hay una ventana anterior válida que comparar (p. ej. el filtro de periodo cubre todo el histórico disponible). */
  anterior: DatosPeriodoAnalitica | null;
  mesesEnPeriodo: number;
  metaUtilizacionPorcentaje: number;
  metaPoolPorcentaje: number;
  metaAsignadoPorcentaje: number;
}

export function calcularKpisPrincipales(params: ParametrosKpisPrincipales): TarjetaKpi[] {
  const actual = calcularCifrasPeriodo(params.vehiculosFlota, params.actual, params.mesesEnPeriodo);
  const anterior = params.anterior ? calcularCifrasPeriodo(params.vehiculosFlota, params.anterior, params.mesesEnPeriodo) : null;

  function tarjeta(
    id: string,
    etiqueta: string,
    unidad: TarjetaKpi["unidad"],
    valorActual: number | null,
    valorAnterior: number | null | undefined,
    meta: number | null,
    direccionMeta: "MINIMO" | "MAXIMO" | undefined,
    menorEsMejor: boolean,
    formula: string
  ): TarjetaKpi {
    const actualNum = valorActual ?? 0;
    const anteriorNum = valorAnterior ?? null;
    return {
      id,
      etiqueta,
      unidad,
      valorActual: actualNum,
      valorAnterior: anteriorNum,
      meta,
      direccionMeta,
      menorEsMejor,
      variacionPorcentaje: calcularVariacionPorcentaje(actualNum, anteriorNum),
      formula,
      sinDatosAnterior: anteriorNum === null,
    };
  }

  return [
    tarjeta(
      "total-unidades",
      "Total de unidades de flotilla",
      "numero",
      actual.totalUnidades,
      anterior?.totalUnidades,
      ANALITICA_CONFIG.metaFlotaTotalUnidades,
      "MINIMO",
      false,
      "Conteo de vehículos con modalidad Pool o Asignado en el catálogo (excluye Uber)."
    ),
    tarjeta(
      "pct-pool",
      "% Pool",
      "porcentaje",
      actual.poolPorcentaje,
      anterior?.poolPorcentaje,
      params.metaPoolPorcentaje,
      "MINIMO",
      false,
      "(vehículos Pool ÷ total de flotilla) × 100."
    ),
    tarjeta(
      "pct-asignado",
      "% Asignado",
      "porcentaje",
      actual.asignadoPorcentaje,
      anterior?.asignadoPorcentaje,
      params.metaAsignadoPorcentaje,
      "MAXIMO",
      false,
      "(vehículos Asignado ÷ total de flotilla) × 100."
    ),
    tarjeta(
      "utilizacion-promedio",
      "Utilización promedio de flotilla",
      "porcentaje",
      actual.utilizacionPromedio,
      anterior?.utilizacionPromedio,
      params.metaUtilizacionPorcentaje,
      "MINIMO",
      false,
      `Viajes completados por vehículo ÷ capacidad configurada (${ANALITICA_CONFIG.utilizacion.maximoViajesPorMes} viajes/mes, escalada a la duración del periodo), acotado a 100% y promediado entre unidades de flotilla.`
    ),
    tarjeta(
      "reservas-totales",
      "Reservaciones totales",
      "numero",
      actual.reservasTotales,
      anterior?.reservasTotales,
      null,
      undefined,
      false,
      "Solicitudes del periodo que llegaron a tener una reservación asociada."
    ),
    tarjeta(
      "viajes-completados",
      "Viajes completados",
      "numero",
      actual.viajesCompletados,
      anterior?.viajesCompletados,
      null,
      undefined,
      false,
      "Reservaciones con estado Completada en el periodo."
    ),
    tarjeta(
      "tasa-aprobacion",
      "Tasa de aprobación",
      "porcentaje",
      actual.tasaAprobacion,
      anterior?.tasaAprobacion,
      ANALITICA_CONFIG.metaTasaAprobacionPorcentaje,
      "MINIMO",
      false,
      "Solicitudes aprobadas o en una etapa posterior ÷ (esas mismas + rechazadas) × 100."
    ),
    tarjeta(
      "costo-total-movilidad",
      "Costo total de movilidad",
      "mxn",
      actual.costoTotalMovilidad,
      anterior?.costoTotalMovilidad,
      null,
      undefined,
      true,
      "Suma del costo real de todos los viajes completados en el periodo."
    ),
    tarjeta(
      "horas-administrativas-ahorradas",
      "Horas administrativas ahorradas",
      "horas",
      actual.horasAhorradas,
      anterior?.horasAhorradas,
      null,
      undefined,
      false,
      `Viajes completados × ${ANALITICA_CONFIG.horasAhorradasPorViajeDigitalizado} h ahorradas por digitalización (vs. coordinar por llamadas/correo).`
    ),
    tarjeta(
      "vehiculos-subutilizados",
      "Vehículos subutilizados",
      "numero",
      actual.vehiculosSubutilizados,
      anterior?.vehiculosSubutilizados,
      0,
      "MAXIMO",
      true,
      `Vehículos de flotilla con menos de ${ANALITICA_CONFIG.utilizacion.minimoViajesPorMes} viajes/mes (umbral escalado a la duración del periodo).`
    ),
    tarjeta(
      "uso-fuera-de-horario",
      "Uso fuera de horario",
      "porcentaje",
      actual.usoFueraDeHorarioPorcentaje,
      anterior?.usoFueraDeHorarioPorcentaje,
      ANALITICA_CONFIG.metaMaximaUsoFueraDeHorarioPorcentaje,
      "MAXIMO",
      true,
      "Viajes completados fuera del horario laboral o en fin de semana ÷ total de viajes completados × 100."
    ),
    tarjeta(
      "incidencias-por-100-viajes",
      "Incidencias por cada 100 viajes",
      "numero",
      actual.incidenciasPor100,
      anterior?.incidenciasPor100,
      ANALITICA_CONFIG.metaMaximaIncidenciasPorCadaCienViajes,
      "MAXIMO",
      true,
      "(incidencias registradas en el periodo ÷ viajes completados) × 100."
    ),
  ];
}

// ---------------------------------------------------------------------------
// Sección 3: Composición Asignado vs. Pool (requisito 3)
// ---------------------------------------------------------------------------
export function calcularComposicionPorDimension<T extends { modalidad: ModalidadVehiculo }, K extends string>(
  vehiculos: T[],
  obtenerClave: (v: T) => K
): { clave: K; poolCount: number; asignadoCount: number; total: number }[] {
  const flota = vehiculos.filter((v) => v.modalidad === "POOL" || v.modalidad === "ASIGNADO");
  const grupos = agruparPorClave(flota, obtenerClave);
  return Array.from(grupos.entries()).map(([clave, items]) => ({
    clave,
    poolCount: items.filter((v) => v.modalidad === "POOL").length,
    asignadoCount: items.filter((v) => v.modalidad === "ASIGNADO").length,
    total: items.length,
  }));
}

/** Evolución mensual de la mezcla Pool/Asignado, basada en el % de viajes completados de cada modalidad (no hay historial de catálogo). */
export function calcularEvolucionMensualComposicion(
  registrosHistoricosFlotilla: RegistroViaje[],
  meses: number,
  ahora: Date
): Array<{ anioMes: string; etiqueta: string; poolPorcentaje: number | null; asignadoPorcentaje: number | null }> {
  return construirSerieMensual(registrosHistoricosFlotilla, (r) => r.fecha, meses, ahora, (grupo) => {
    const pool = grupo.filter((r) => r.modalidadVehiculo === "POOL").length;
    const asignado = grupo.filter((r) => r.modalidadVehiculo === "ASIGNADO").length;
    const total = pool + asignado;
    return {
      poolPorcentaje: total > 0 ? redondear((pool / total) * 100, 1) : null,
      asignadoPorcentaje: total > 0 ? redondear((asignado / total) * 100, 1) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Sección 4: Costo por kilómetro por alternativa (requisito 4)
// ---------------------------------------------------------------------------
export interface CostoPorKmAlternativa {
  alternativa: Alternativa;
  viajes: number;
  kmTotal: number;
  costoTotal: number;
  costoPromedioPorKm: number | null;
}

export function calcularCostoPorKmPorAlternativa(registrosCompletados: RegistroViaje[]): CostoPorKmAlternativa[] {
  return (["POOL", "ASIGNADO", "UBER"] as Alternativa[]).map((alternativa) => {
    const grupo = registrosCompletados.filter((r) => obtenerAlternativa(r) === alternativa && r.distanciaKm > 0);
    const kmTotal = sumaPor(grupo, (r) => r.distanciaKm);
    const costoTotal = redondear(sumaPor(grupo, (r) => r.costoMxn), 2);
    return { alternativa, viajes: grupo.length, kmTotal, costoTotal, costoPromedioPorKm: kmTotal > 0 ? redondear(costoTotal / kmTotal, 2) : null };
  });
}

export function calcularCostoPorKmPorDimension<K extends string>(
  registrosCompletados: RegistroViaje[],
  obtenerClave: (r: RegistroViaje) => K
): { clave: K; kmTotal: number; costoTotal: number; costoPromedioPorKm: number | null }[] {
  const grupos = agruparPorClave(
    registrosCompletados.filter((r) => r.distanciaKm > 0),
    obtenerClave
  );
  return Array.from(grupos.entries()).map(([clave, items]) => {
    const kmTotal = sumaPor(items, (r) => r.distanciaKm);
    const costoTotal = redondear(sumaPor(items, (r) => r.costoMxn), 2);
    return { clave, kmTotal, costoTotal, costoPromedioPorKm: kmTotal > 0 ? redondear(costoTotal / kmTotal, 2) : null };
  });
}

export function calcularCostoPorKmPorVehiculo(
  vehiculos: { id: string; nombre: string }[],
  registrosCompletadosFlotilla: RegistroViaje[]
): { vehiculoId: string; nombre: string; costoPromedioPorKm: number | null; viajes: number; kmTotal: number }[] {
  const porVehiculo = agruparPorClave(
    registrosCompletadosFlotilla.filter((r) => r.vehiculoId && r.distanciaKm > 0),
    (r) => r.vehiculoId as string
  );
  return vehiculos.map((v) => {
    const grupo = porVehiculo.get(v.id) ?? [];
    const kmTotal = sumaPor(grupo, (r) => r.distanciaKm);
    const costoTotal = sumaPor(grupo, (r) => r.costoMxn);
    return { vehiculoId: v.id, nombre: v.nombre, costoPromedioPorKm: kmTotal > 0 ? redondear(costoTotal / kmTotal, 2) : null, viajes: grupo.length, kmTotal };
  });
}

export function calcularEvolucionMensualCostoPorKm(
  registrosHistoricosCompletados: RegistroViaje[],
  meses: number,
  ahora: Date
): Array<{ anioMes: string; etiqueta: string; pool: number | null; asignado: number | null; uber: number | null }> {
  return construirSerieMensual(registrosHistoricosCompletados, (r) => r.fecha, meses, ahora, (grupo) => {
    const porAlternativa = calcularCostoPorKmPorAlternativa(grupo);
    return {
      pool: porAlternativa.find((a) => a.alternativa === "POOL")?.costoPromedioPorKm ?? null,
      asignado: porAlternativa.find((a) => a.alternativa === "ASIGNADO")?.costoPromedioPorKm ?? null,
      uber: porAlternativa.find((a) => a.alternativa === "UBER")?.costoPromedioPorKm ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Sección 6: Ahorro económico generado (requisito 6) — reusa servicioAhorros
// ---------------------------------------------------------------------------
export function construirViajesParaAhorro(registrosCompletados: RegistroViaje[]): ViajeParaAhorro[] {
  return registrosCompletados
    .filter((r) => r.distanciaKm > 0)
    .map((r) => ({
      distanciaKm: r.distanciaKm,
      alternativaElegida: obtenerAlternativa(r),
      costoAlternativaElegida: r.costoMxn,
      digitalizado: true,
    }));
}

export function calcularAhorroPorGrupo<K extends string>(
  registrosCompletados: RegistroViaje[],
  obtenerClave: (r: RegistroViaje) => K
): { clave: K; ahorro: ResultadoAhorros | ResultadoSinDatos }[] {
  const grupos = agruparPorClave(registrosCompletados, obtenerClave);
  return Array.from(grupos.entries()).map(([clave, items]) => ({ clave, ahorro: calcularAhorros(construirViajesParaAhorro(items)) }));
}

export function calcularEvolucionMensualAhorro(
  registrosHistoricosCompletados: RegistroViaje[],
  meses: number,
  ahora: Date
): Array<{ anioMes: string; etiqueta: string; ahorro: number | null }> {
  return construirSerieMensual(registrosHistoricosCompletados, (r) => r.fecha, meses, ahora, (grupo) => {
    const resultado = calcularAhorros(construirViajesParaAhorro(grupo));
    return { ahorro: esResultadoSinDatos(resultado) ? null : redondear(resultado.ahorroTotal, 2) };
  });
}

export function calcularAhorroPromedioPorViaje(ahorroTotal: number, viajesCompletados: number): number | null {
  return viajesCompletados > 0 ? redondear(ahorroTotal / viajesCompletados, 2) : null;
}

/** ROI estimado: ahorro acumulado ÷ inversión estimada de la iniciativa, expresado en %. */
export function calcularRoiEstimado(ahorroAcumuladoMxn: number, costoImplementacionEstimadoMx: number): number | null {
  if (!Number.isFinite(costoImplementacionEstimadoMx) || costoImplementacionEstimadoMx <= 0) return null;
  return redondear((ahorroAcumuladoMxn / costoImplementacionEstimadoMx) * 100, 1);
}

// ---------------------------------------------------------------------------
// Sección 7: Emisiones de CO₂ evitadas (requisito 7)
// ---------------------------------------------------------------------------
export interface SeccionEmisiones {
  totalEmitidoKg: number;
  totalEvitadoKg: number;
  emitidoPorKmGramos: number | null;
  emitidoPorViajeGramos: number | null;
  porAlternativa: { alternativa: Alternativa; emitidoKg: number; evitadoKg: number; viajes: number }[];
  porTerritorio: { territorioId: string; emitidoKg: number; evitadoKg: number }[];
  evolucionMensual: Array<{ anioMes: string; etiqueta: string; emitidoKg: number; evitadoKg: number }>;
  factoresUsados: string[];
}

export function calcularSeccionEmisiones(
  registrosActualCompletados: RegistroViaje[],
  registrosHistoricosCompletados: RegistroViaje[],
  meses: number,
  ahora: Date
): SeccionEmisiones {
  const totalEmitidoKg = redondear(sumaPor(registrosActualCompletados, (r) => r.emisionesGramos) / 1000, 1);
  const totalEvitadoKg = redondear(sumaPor(registrosActualCompletados, (r) => r.co2EvitadoGramos) / 1000, 1);
  const kmTotal = sumaPor(registrosActualCompletados, (r) => r.distanciaKm);

  const porAlternativa = (["POOL", "ASIGNADO", "UBER"] as Alternativa[]).map((alternativa) => {
    const grupo = registrosActualCompletados.filter((r) => obtenerAlternativa(r) === alternativa);
    return {
      alternativa,
      emitidoKg: redondear(sumaPor(grupo, (r) => r.emisionesGramos) / 1000, 1),
      evitadoKg: redondear(sumaPor(grupo, (r) => r.co2EvitadoGramos) / 1000, 1),
      viajes: grupo.length,
    };
  });

  const porTerritorioMapa = agruparPorClave(registrosActualCompletados, (r) => r.territorioId);
  const porTerritorio = Array.from(porTerritorioMapa.entries()).map(([territorioId, grupo]) => ({
    territorioId,
    emitidoKg: redondear(sumaPor(grupo, (r) => r.emisionesGramos) / 1000, 1),
    evitadoKg: redondear(sumaPor(grupo, (r) => r.co2EvitadoGramos) / 1000, 1),
  }));

  const evolucionMensual = construirSerieMensual(registrosHistoricosCompletados, (r) => r.fecha, meses, ahora, (grupo) => ({
    emitidoKg: redondear(sumaPor(grupo, (r) => r.emisionesGramos) / 1000, 1),
    evitadoKg: redondear(sumaPor(grupo, (r) => r.co2EvitadoGramos) / 1000, 1),
  }));

  return {
    totalEmitidoKg,
    totalEvitadoKg,
    emitidoPorKmGramos: kmTotal > 0 ? redondear((totalEmitidoKg * 1000) / kmTotal, 1) : null,
    emitidoPorViajeGramos: registrosActualCompletados.length > 0 ? redondear((totalEmitidoKg * 1000) / registrosActualCompletados.length, 1) : null,
    porAlternativa,
    porTerritorio,
    evolucionMensual,
    factoresUsados: [
      `Gasolina: ${EMISIONES_CONFIG.combustibles.GASOLINA.gCO2PorLitro} g CO₂/litro (estimado)`,
      `Diésel: ${EMISIONES_CONFIG.combustibles.DIESEL.gCO2PorLitro} g CO₂/litro (estimado)`,
      `Eléctrico: ${EMISIONES_CONFIG.combustibles.ELECTRICO.gCO2PorKm} g CO₂/km, basado en la matriz eléctrica de México (estimado)`,
      `Uber (promedio de flota): ${EMISIONES_CONFIG.uber.gCO2PorKm} g CO₂/km (estimado)`,
      `Escenario base para "CO₂ evitado": el viaje se hubiera hecho en Uber, ${EMISIONES_CONFIG.escenarioBase.gCO2PorKm} g CO₂/km (estimado)`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Sección 8: matriz comparativa, rankings, extremos (requisito 8)
// ---------------------------------------------------------------------------
export interface FilaMatrizComparativa {
  alternativa: Alternativa;
  costoPromedioPorKm: number | null;
  utilizacionPromedioPorcentaje: number | null;
  emisionesPromedioPorKmGramos: number | null;
}

export function calcularMatrizComparativa(
  costoPorAlternativa: CostoPorKmAlternativa[],
  emisionesPorAlternativa: { alternativa: Alternativa; emitidoKg: number; viajes: number }[],
  utilizacionFlotilla: Pick<ResumenUtilizacionFlotilla, "promedioPoolPorcentaje" | "promedioAsignadoPorcentaje">
): FilaMatrizComparativa[] {
  return (["POOL", "ASIGNADO", "UBER"] as Alternativa[]).map((alternativa) => {
    const costo = costoPorAlternativa.find((c) => c.alternativa === alternativa) ?? null;
    const emisiones = emisionesPorAlternativa.find((e) => e.alternativa === alternativa) ?? null;
    const kmTotalAlt = costo?.kmTotal ?? 0;
    return {
      alternativa,
      costoPromedioPorKm: costo?.costoPromedioPorKm ?? null,
      utilizacionPromedioPorcentaje:
        alternativa === "POOL"
          ? utilizacionFlotilla.promedioPoolPorcentaje
          : alternativa === "ASIGNADO"
            ? utilizacionFlotilla.promedioAsignadoPorcentaje
            : null,
      emisionesPromedioPorKmGramos: emisiones && kmTotalAlt > 0 ? redondear((emisiones.emitidoKg * 1000) / kmTotalAlt, 1) : null,
    };
  });
}

export function calcularRankingTerritoriosPorAhorro(
  ahorroPorTerritorio: { clave: string; ahorro: ResultadoAhorros | ResultadoSinDatos }[]
): { territorioId: string; ahorroTotal: number }[] {
  return ahorroPorTerritorio
    .filter((g): g is { clave: string; ahorro: ResultadoAhorros } => !esResultadoSinDatos(g.ahorro))
    .map((g) => ({ territorioId: g.clave, ahorroTotal: redondear(g.ahorro.ahorroTotal, 2) }))
    .sort((a, b) => b.ahorroTotal - a.ahorroTotal);
}

export function calcularRankingUnidadesSubutilizadas(porVehiculo: UtilizacionVehiculo[]): UtilizacionVehiculo[] {
  return porVehiculo.filter((v) => v.clasificacion === "SUBUTILIZADO").sort((a, b) => a.utilizacionPorcentaje - b.utilizacionPorcentaje);
}

export function calcularVehiculosExtremos(
  porVehiculo: UtilizacionVehiculo[],
  top = 5
): { masUtilizados: UtilizacionVehiculo[]; menosUtilizados: UtilizacionVehiculo[] } {
  const conViajes = porVehiculo.filter((v) => v.viajes > 0);
  return {
    masUtilizados: [...conViajes].sort((a, b) => b.utilizacionPorcentaje - a.utilizacionPorcentaje).slice(0, top),
    menosUtilizados: [...porVehiculo].sort((a, b) => a.utilizacionPorcentaje - b.utilizacionPorcentaje).slice(0, top),
  };
}

export function calcularIncidenciasPorCategoria(
  incidencias: { tipoIncidencia: TipoIncidencia }[]
): { tipoIncidencia: TipoIncidencia; total: number }[] {
  const grupos = agruparPorClave(incidencias, (i) => i.tipoIncidencia);
  return Array.from(grupos.entries())
    .map(([tipoIncidencia, items]) => ({ tipoIncidencia, total: items.length }))
    .sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// Sección 9: Recomendaciones para gerencia (requisito 9) — reglas sobre datos reales
// ---------------------------------------------------------------------------
export interface Recomendacion {
  id: string;
  titulo: string;
  texto: string;
  prioridad: NivelPrioridad;
  indicadorId?: string;
}

function recomendacionIncrementarPool(composicion: ComposicionFlotilla, metaPoolPorcentaje: number): Recomendacion | null {
  if (composicion.totalFlota === 0 || composicion.poolPorcentaje >= metaPoolPorcentaje) return null;
  const brecha = redondear(metaPoolPorcentaje - composicion.poolPorcentaje, 1);
  return {
    id: "incrementar-pool-hacia-meta",
    titulo: "Incrementar la proporción de vehículos Pool",
    texto: `La flotilla está en ${redondear(composicion.poolPorcentaje, 1)}% Pool, ${brecha} puntos porcentuales por debajo de la meta de ${metaPoolPorcentaje}%.`,
    prioridad: brecha >= 15 ? "ALTA" : "MEDIA",
    indicadorId: "pct-pool",
  };
}

function recomendacionMigrarAsignadosSubutilizados(porVehiculo: UtilizacionVehiculo[]): Recomendacion | null {
  const candidatos = porVehiculo.filter((v) => v.modalidad === "ASIGNADO" && v.clasificacion === "SUBUTILIZADO");
  if (candidatos.length === 0) return null;

  const porTerritorio = new Map<string, number>();
  for (const v of candidatos) porTerritorio.set(v.territorioId, (porTerritorio.get(v.territorioId) ?? 0) + 1);
  const [territorioId, cantidad] = Array.from(porTerritorio.entries()).sort((a, b) => b[1] - a[1])[0];

  return {
    id: "migrar-asignado-a-pool",
    titulo: "Migrar unidades Asignado subutilizadas a Pool",
    texto: `Migrar unidades asignadas con baja utilización en ${nombreTerritorio(territorioId)} al esquema Pool (${cantidad} unidad${cantidad > 1 ? "es" : ""} identificada${cantidad > 1 ? "s" : ""}).`,
    prioridad: cantidad >= 3 ? "ALTA" : "MEDIA",
    indicadorId: "vehiculos-subutilizados",
  };
}

function recomendacionReubicarVehiculos(
  porTerritorio: { territorioId: string; utilizacionPromedio: number | null; subutilizados: number; sobreutilizados: number }[]
): Recomendacion | null {
  const conDatos = porTerritorio.filter((t) => t.utilizacionPromedio !== null);
  if (conDatos.length < 2) return null;

  const ordenado = [...conDatos].sort((a, b) => (b.utilizacionPromedio as number) - (a.utilizacionPromedio as number));
  const masAlto = ordenado[0];
  const masBajo = ordenado[ordenado.length - 1];
  if (masBajo.subutilizados === 0) return null;
  const brecha = (masAlto.utilizacionPromedio as number) - (masBajo.utilizacionPromedio as number);
  if (brecha < 20) return null;

  return {
    id: "reubicar-vehiculos-territorio",
    titulo: "Reubicar unidades entre territorios",
    texto: `Reubicar vehículos de ${nombreTerritorio(masBajo.territorioId)} (utilización ${redondear(masBajo.utilizacionPromedio as number, 0)}%) a ${nombreTerritorio(masAlto.territorioId)} (utilización ${redondear(masAlto.utilizacionPromedio as number, 0)}%).`,
    prioridad: "MEDIA",
    indicadorId: "utilizacion-promedio",
  };
}

function recomendacionUsarUberEnPico(costoPorAlternativa: CostoPorKmAlternativa[], registrosCompletados: RegistroViaje[]): Recomendacion | null {
  const uber = costoPorAlternativa.find((a) => a.alternativa === "UBER");
  const pool = costoPorAlternativa.find((a) => a.alternativa === "POOL");
  const asignado = costoPorAlternativa.find((a) => a.alternativa === "ASIGNADO");
  if (!uber?.costoPromedioPorKm) return null;

  const costosFlotilla = [pool?.costoPromedioPorKm, asignado?.costoPromedioPorKm].filter((v): v is number => v !== null && v !== undefined);
  if (costosFlotilla.length === 0) return null;
  const costoFlotillaMin = Math.min(...costosFlotilla);
  if (uber.costoPromedioPorKm >= costoFlotillaMin) return null;

  const flotillaFueraHorario = registrosCompletados.filter((r) => r.fueraDeHorario && obtenerAlternativa(r) !== "UBER");
  if (flotillaFueraHorario.length === 0) return null;

  const porTerritorio = new Map<string, number>();
  for (const r of flotillaFueraHorario) porTerritorio.set(r.territorioId, (porTerritorio.get(r.territorioId) ?? 0) + 1);
  const [territorioId, cantidad] = Array.from(porTerritorio.entries()).sort((a, b) => b[1] - a[1])[0];

  return {
    id: "usar-uber-horario-pico",
    titulo: "Usar Uber en viajes cortos en horario pico",
    texto: `Usar Uber en viajes cortos en horario pico en ${nombreTerritorio(territorioId)}: ${cantidad} viaje(s) de flotilla fuera de horario laboral cuestan más por km ($${redondear(costoFlotillaMin, 2)}) que Uber ($${redondear(uber.costoPromedioPorKm, 2)}/km).`,
    prioridad: "MEDIA",
    indicadorId: "costo-total-movilidad",
  };
}

function recomendacionMantenimientoPorCosto(
  costoPorVehiculo: { vehiculoId: string; nombre: string; costoPromedioPorKm: number | null; viajes: number }[],
  n = 5
): Recomendacion | null {
  const conDatos = costoPorVehiculo.filter((v) => v.costoPromedioPorKm !== null && v.viajes >= 2);
  if (conDatos.length === 0) return null;

  const top = [...conDatos].sort((a, b) => (b.costoPromedioPorKm as number) - (a.costoPromedioPorKm as number)).slice(0, Math.min(n, conDatos.length));
  return {
    id: "mantenimiento-mayor-costo-km",
    titulo: `Dar mantenimiento a las ${top.length} unidades con mayor costo por km`,
    texto: `Dar mantenimiento a: ${top.map((v) => `${v.nombre} ($${redondear(v.costoPromedioPorKm as number, 2)}/km)`).join(", ")}.`,
    prioridad: "BAJA",
    indicadorId: "costo-total-movilidad",
  };
}

const ORDEN_PRIORIDAD: Record<NivelPrioridad, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };

export interface ParametrosRecomendaciones {
  composicion: ComposicionFlotilla;
  metaPoolPorcentaje: number;
  porVehiculoUtilizacion: UtilizacionVehiculo[];
  porTerritorioUtilizacion: { territorioId: string; utilizacionPromedio: number | null; subutilizados: number; sobreutilizados: number }[];
  costoPorAlternativa: CostoPorKmAlternativa[];
  costoPorVehiculo: { vehiculoId: string; nombre: string; costoPromedioPorKm: number | null; viajes: number }[];
  registrosCompletados: RegistroViaje[];
}

/** Genera recomendaciones accionables a partir de reglas simples sobre los datos reales del periodo filtrado (no texto fijo genérico). */
export function generarRecomendaciones(params: ParametrosRecomendaciones): Recomendacion[] {
  const candidatas = [
    recomendacionIncrementarPool(params.composicion, params.metaPoolPorcentaje),
    recomendacionMigrarAsignadosSubutilizados(params.porVehiculoUtilizacion),
    recomendacionReubicarVehiculos(params.porTerritorioUtilizacion),
    recomendacionUsarUberEnPico(params.costoPorAlternativa, params.registrosCompletados),
    recomendacionMantenimientoPorCosto(params.costoPorVehiculo),
  ];
  return candidatas.filter((r): r is Recomendacion => r !== null).sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]);
}

export const servicioAnalitica = {
  filtrarRegistros,
  calcularVentanaAnterior,
  calcularMesesEnPeriodo,
  construirSerieMensual,
  calcularVariacionPorcentaje,
  calcularKpisPrincipales,
  calcularUtilizacionFlotilla,
  calcularUtilizacionPorTerritorio,
  calcularComposicionPorDimension,
  calcularEvolucionMensualComposicion,
  calcularCostoPorKmPorAlternativa,
  calcularCostoPorKmPorDimension,
  calcularCostoPorKmPorVehiculo,
  calcularEvolucionMensualCostoPorKm,
  construirViajesParaAhorro,
  calcularAhorroPorGrupo,
  calcularEvolucionMensualAhorro,
  calcularAhorroPromedioPorViaje,
  calcularRoiEstimado,
  calcularSeccionEmisiones,
  calcularMatrizComparativa,
  calcularRankingTerritoriosPorAhorro,
  calcularRankingUnidadesSubutilizadas,
  calcularVehiculosExtremos,
  calcularIncidenciasPorCategoria,
  generarRecomendaciones,
};
