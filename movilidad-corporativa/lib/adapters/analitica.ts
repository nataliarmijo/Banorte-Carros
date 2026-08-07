/**
 * Adaptador de /analitica: arma el dashboard ejecutivo leyendo Dexie,
 * construyendo `RegistroViaje[]` (una fila por solicitud, enriquecida con
 * vehículo/reservación/check-out cuando existen) y delegando todo el cálculo
 * a servicioAnalitica (Chunk 15), servicioFlota, servicioAhorros y
 * servicioEmisiones (Chunk 4). Se apoya en initializeHistoricalData (Chunk 2)
 * para asegurar que existan ~12 meses de datos históricos antes de calcular
 * las tendencias mensuales.
 */

import { db } from "@/lib/repositories/dexie";
import { initializeHistoricalData } from "@/lib/seed/init";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { ANALITICA_CONFIG } from "@/lib/config/analitica";
import { metasGerenciales } from "@/lib/config/metas";
import { calcularCO2Evitado } from "@/lib/config/emisiones";
import { estaFueraDeHorarioLaboral, esFinDeSemana } from "@/lib/services/servicio-checkout";
import { calcularEmisionesUber } from "@/lib/services/servicio-emisiones";
import { calcularAhorros } from "@/lib/services/servicio-ahorros";
import { calcularComposicionFlotilla, type ComposicionFlotilla } from "@/lib/services/servicio-flota";
import { mapTipoCombustible, mapTipoVehiculo } from "@/lib/adapters/flota";
import { esResultadoSinDatos } from "@/lib/services/types";
import type { ResultadoAhorros, ResultadoSinDatos, TipoVehiculo } from "@/lib/services/types";
import type { CheckOut, ModalidadVehiculo, Reservacion, Solicitud, TipoIncidencia, Usuario, Vehiculo } from "@/lib/models";
import type { TipoCombustible } from "@/lib/config/costos";
import {
  calcularAhorroPorGrupo,
  calcularAhorroPromedioPorViaje,
  calcularComposicionPorDimension,
  calcularCostoPorKmPorAlternativa,
  calcularCostoPorKmPorDimension,
  calcularCostoPorKmPorVehiculo,
  calcularEvolucionMensualAhorro,
  calcularEvolucionMensualComposicion,
  calcularEvolucionMensualCostoPorKm,
  calcularIncidenciasPorCategoria,
  calcularKpisPrincipales,
  calcularMatrizComparativa,
  calcularMesesEnPeriodo,
  calcularRankingTerritoriosPorAhorro,
  calcularRankingUnidadesSubutilizadas,
  calcularRoiEstimado,
  calcularSeccionEmisiones,
  calcularUtilizacionFlotilla,
  calcularUtilizacionPorTerritorio,
  calcularVehiculosExtremos,
  calcularVentanaAnterior,
  construirSerieMensual,
  construirViajesParaAhorro,
  filtrarRegistros,
  generarRecomendaciones,
  type FiltrosAnalitica,
  type RegistroViaje,
  type Recomendacion,
  type ResumenUtilizacionFlotilla,
  type SeccionEmisiones,
  type TarjetaKpi,
  type UtilizacionVehiculo,
  type VehiculoParaUtilizacion,
} from "@/lib/services/servicio-analitica";

export interface FiltrosAnaliticaUI {
  periodoInicio?: Date;
  periodoFin?: Date;
  territorioIds?: string[];
  modalidades?: ModalidadVehiculo[];
  tiposVehiculo?: TipoVehiculo[];
  combustibles?: TipoCombustible[];
  mediosTransporte?: ModalidadVehiculo[];
  areas?: string[];
  tiposViaje?: string[];
}

export interface OpcionTerritorio {
  id: string;
  nombre: string;
}

export interface OpcionesFiltroAnalitica {
  territorios: OpcionTerritorio[];
  modalidades: ModalidadVehiculo[];
  tiposVehiculo: TipoVehiculo[];
  combustibles: TipoCombustible[];
  mediosTransporte: ModalidadVehiculo[];
  areas: string[];
  tiposViaje: string[];
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function nombreTerritorio(territorioId: string): string {
  return PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios]?.nombre ?? territorioId;
}

function nombreVehiculo(vehiculo: Vehiculo): string {
  return `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})`;
}

// ---------------------------------------------------------------------------
// Construcción de RegistroViaje[] a partir de las tablas de Dexie
// ---------------------------------------------------------------------------
function construirRegistrosViaje(
  solicitudes: Solicitud[],
  reservaciones: Reservacion[],
  checkOuts: CheckOut[],
  vehiculos: Vehiculo[],
  usuarios: Usuario[]
): RegistroViaje[] {
  const reservacionPorSolicitudId = new Map(reservaciones.map((r) => [r.solicitudId, r]));
  const checkOutPorReservacionId = new Map(checkOuts.map((c) => [c.reservacionId, c]));
  const vehiculoPorId = new Map(vehiculos.map((v) => [v.id, v]));
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u]));

  return solicitudes.map((solicitud): RegistroViaje => {
    const reservacion = reservacionPorSolicitudId.get(solicitud.id);
    const checkOut = reservacion ? checkOutPorReservacionId.get(reservacion.id) : undefined;
    const vehiculo = reservacion ? vehiculoPorId.get(reservacion.vehiculoId) : undefined;
    const colaborador = usuarioPorId.get(solicitud.usuarioSolicitanteId);
    const completado = reservacion?.estadoReservacion === "COMPLETADA";

    let distanciaKm = solicitud.distanciaEstimadaKm ?? 0;
    let costoMxn = solicitud.costoEstimado ?? 0;
    let esEstimadoCosto = true;
    let emisionesGramos = solicitud.emisionesEstimadasGramos ?? 0;
    let co2EvitadoGramos = 0;
    let fueraDeHorario = false;
    let finDeSemana = false;

    if (completado && reservacion) {
      fueraDeHorario = estaFueraDeHorarioLaboral(new Date(reservacion.fechaInicio)) || estaFueraDeHorarioLaboral(new Date(reservacion.fechaFin));
      finDeSemana = esFinDeSemana(new Date(reservacion.fechaInicio)) || esFinDeSemana(new Date(reservacion.fechaFin));

      if (checkOut) {
        distanciaKm = checkOut.kilometrosRecorridos;
        costoMxn = checkOut.costoReal;
        esEstimadoCosto = false;
        emisionesGramos = checkOut.emisionesRealesGramos;
        co2EvitadoGramos = calcularCO2Evitado(distanciaKm, emisionesGramos);
      } else if (reservacion.modalidadAsignada === "UBER") {
        costoMxn = reservacion.costoReal;
        esEstimadoCosto = false;
        const emisiones = calcularEmisionesUber({ km: distanciaKm });
        emisionesGramos = emisiones.totalGramosCo2;
        co2EvitadoGramos = emisiones.co2EvitadoGramos;
      }
    }

    const tipoVehiculo: TipoVehiculo | undefined = vehiculo
      ? mapTipoVehiculo(vehiculo)
      : esTipoVehiculoValido(solicitud.tipoVehiculoRequerido)
        ? solicitud.tipoVehiculoRequerido
        : undefined;

    return {
      solicitudId: solicitud.id,
      reservacionId: reservacion?.id,
      vehiculoId: vehiculo?.id,
      fecha: new Date(solicitud.fechaCreacion),
      territorioId: solicitud.territorioId,
      area: colaborador?.area,
      tipoViaje: solicitud.tipoViaje,
      modalidadRequerida: solicitud.modalidadRequerida,
      modalidadVehiculo: vehiculo?.modalidad,
      tipoVehiculo,
      tipoCombustible: vehiculo ? mapTipoCombustible(vehiculo.combustibleTipo) : undefined,
      estadoSolicitud: solicitud.estadoSolicitud,
      completado,
      distanciaKm,
      costoMxn,
      esEstimadoCosto,
      emisionesGramos,
      co2EvitadoGramos,
      fueraDeHorario,
      finDeSemana,
    };
  });
}

function esTipoVehiculoValido(valor: string | undefined): valor is TipoVehiculo {
  return valor === "sedan-compacto" || valor === "sedan-ejecutivo" || valor === "suv-asignado";
}

// ---------------------------------------------------------------------------
// Metas efectivas: usa /lib/config/metas.ts cuando se filtra un solo
// territorio con meta configurada; si no, cae a los valores globales de
// ANALITICA_CONFIG.
// ---------------------------------------------------------------------------
function obtenerMetasEfectivas(territorioIds: string[] | undefined) {
  if (territorioIds && territorioIds.length === 1) {
    const meta = metasGerenciales.find((m) => m.territorio === nombreTerritorio(territorioIds[0]));
    if (meta) {
      return {
        metaPoolPorcentaje: meta.metaPoolPct,
        metaAsignadoPorcentaje: 100 - meta.metaPoolPct,
        metaUtilizacionPorcentaje: meta.metaUtilizacion,
      };
    }
  }
  return {
    metaPoolPorcentaje: ANALITICA_CONFIG.metaPoolPorcentaje,
    metaAsignadoPorcentaje: ANALITICA_CONFIG.metaAsignadoPorcentaje,
    metaUtilizacionPorcentaje: ANALITICA_CONFIG.metaUtilizacionPorDefecto,
  };
}

function vehiculoPasaFiltrosBase(vehiculo: Vehiculo, filtros: FiltrosAnaliticaUI): boolean {
  if (filtros.territorioIds?.length && !filtros.territorioIds.includes(vehiculo.territorioId)) return false;
  if (filtros.modalidades?.length && !filtros.modalidades.includes(vehiculo.modalidad)) return false;
  if (filtros.tiposVehiculo?.length && !filtros.tiposVehiculo.includes(mapTipoVehiculo(vehiculo))) return false;
  if (filtros.combustibles?.length && !filtros.combustibles.includes(mapTipoCombustible(vehiculo.combustibleTipo))) return false;
  return true;
}

function filtrosParaServicio(filtros: FiltrosAnaliticaUI, periodoInicio?: Date, periodoFin?: Date): FiltrosAnalitica {
  return {
    periodoInicio,
    periodoFin,
    territorioIds: filtros.territorioIds,
    modalidades: filtros.modalidades,
    tiposVehiculo: filtros.tiposVehiculo,
    combustibles: filtros.combustibles,
    mediosTransporte: filtros.mediosTransporte,
    areas: filtros.areas,
    tiposViaje: filtros.tiposViaje,
  };
}

// ---------------------------------------------------------------------------
// Bundle final que consume la UI
// ---------------------------------------------------------------------------
export interface FilaComposicionDimension {
  clave: string;
  nombre: string;
  poolCount: number;
  asignadoCount: number;
  total: number;
}

export interface FilaCostoDimension {
  clave: string;
  nombre: string;
  costoPromedioPorKm: number | null;
  kmTotal: number;
  costoTotal: number;
}

export interface SeccionComposicionDashboard {
  actual: ComposicionFlotilla;
  metaPoolPorcentaje: number;
  metaAsignadoPorcentaje: number;
  evolucionMensual: Array<{ anioMes: string; etiqueta: string; poolPorcentaje: number | null; asignadoPorcentaje: number | null }>;
  porTerritorio: FilaComposicionDimension[];
  porTipoVehiculo: FilaComposicionDimension[];
}

export interface SeccionCostoPorKmDashboard {
  porAlternativa: ReturnType<typeof calcularCostoPorKmPorAlternativa>;
  evolucionMensual: ReturnType<typeof calcularEvolucionMensualCostoPorKm>;
  porTerritorio: FilaCostoDimension[];
  porTipoVehiculo: FilaCostoDimension[];
  porTipoViaje: FilaCostoDimension[];
}

export interface SeccionUtilizacionDashboard {
  resumen: ResumenUtilizacionFlotilla;
  porTerritorio: Array<{ territorioId: string; nombre: string; utilizacionPromedio: number | null; subutilizados: number; sobreutilizados: number }>;
  evolucionMensual: Array<{ anioMes: string; etiqueta: string; utilizacionPromedio: number | null }>;
  umbralMinimoViajesPorMes: number;
  umbralMaximoViajesPorMes: number;
}

export interface SeccionAhorroDashboard {
  resultado: ResultadoAhorros | ResultadoSinDatos;
  porTerritorio: Array<{ territorioId: string; nombre: string; ahorro: ResultadoAhorros | ResultadoSinDatos }>;
  evolucionMensual: ReturnType<typeof calcularEvolucionMensualAhorro>;
  ahorroPromedioPorViaje: number | null;
  roiEstimadoPorcentaje: number | null;
}

export interface DashboardAnalitica {
  kpis: TarjetaKpi[];
  composicion: SeccionComposicionDashboard;
  costoPorKm: SeccionCostoPorKmDashboard;
  utilizacion: SeccionUtilizacionDashboard;
  ahorro: SeccionAhorroDashboard;
  emisiones: SeccionEmisiones;
  matrizComparativa: ReturnType<typeof calcularMatrizComparativa>;
  rankingTerritoriosPorAhorro: Array<{ territorioId: string; nombre: string; ahorroTotal: number }>;
  rankingUnidadesSubutilizadas: UtilizacionVehiculo[];
  vehiculosExtremos: { masUtilizados: UtilizacionVehiculo[]; menosUtilizados: UtilizacionVehiculo[] };
  incidenciasPorCategoria: Array<{ tipoIncidencia: TipoIncidencia; total: number }>;
  recomendaciones: Recomendacion[];
  opcionesFiltro: OpcionesFiltroAnalitica;
  filtrosAplicados: FiltrosAnaliticaUI;
  periodo: { inicio: Date; fin: Date; mesesEnPeriodo: number };
}

export async function obtenerDashboardAnalitica(filtros: FiltrosAnaliticaUI = {}): Promise<DashboardAnalitica> {
  await initializeHistoricalData();

  const [vehiculos, usuarios, solicitudes, reservaciones, checkOuts, incidencias] = await Promise.all([
    db.vehiculos.toArray(),
    db.usuarios.toArray(),
    db.solicitudes.toArray(),
    db.reservaciones.toArray(),
    db.checkOuts.toArray(),
    db.incidencias.toArray(),
  ]);

  const ahora = new Date();
  const periodoFin = filtros.periodoFin ?? new Date(ahora.getTime() + MS_POR_DIA);
  const periodoInicio = filtros.periodoInicio ?? new Date(ahora.getFullYear(), ahora.getMonth() - 3, ahora.getDate());
  const mesesEnPeriodo = calcularMesesEnPeriodo(periodoInicio, periodoFin);
  const ventanaAnterior = calcularVentanaAnterior(periodoInicio, periodoFin);

  const registros = construirRegistrosViaje(solicitudes, reservaciones, checkOuts, vehiculos, usuarios);

  const registrosActual = filtrarRegistros(registros, filtrosParaServicio(filtros, periodoInicio, periodoFin));
  const registrosAnterior = filtrarRegistros(registros, filtrosParaServicio(filtros, ventanaAnterior.inicio, ventanaAnterior.fin));

  const inicioHistorico = new Date(ahora.getFullYear(), ahora.getMonth() - (ANALITICA_CONFIG.mesesHistoricos - 1), 1);
  const registrosHistoricos = filtrarRegistros(registros, filtrosParaServicio(filtros, inicioHistorico, new Date(ahora.getTime() + MS_POR_DIA)));

  const vehiculosFiltrados = vehiculos.filter((v) => vehiculoPasaFiltrosBase(v, filtros));
  const vehiculosFlotaFiltrados = vehiculosFiltrados.filter((v) => v.modalidad === "POOL" || v.modalidad === "ASIGNADO");
  const vehiculosParaUtilizacion: VehiculoParaUtilizacion[] = vehiculosFlotaFiltrados.map((v) => ({
    id: v.id,
    nombre: nombreVehiculo(v),
    territorioId: v.territorioId,
    modalidad: v.modalidad,
  }));

  const metas = obtenerMetasEfectivas(filtros.territorioIds);

  // --- KPIs ---
  const incidenciasActual = incidenciasParaVehiculos(incidencias, vehiculosFlotaFiltrados, periodoInicio, periodoFin);
  const incidenciasAnterior = incidenciasParaVehiculos(incidencias, vehiculosFlotaFiltrados, ventanaAnterior.inicio, ventanaAnterior.fin);

  const kpis = calcularKpisPrincipales({
    vehiculosFlota: vehiculosParaUtilizacion,
    actual: { registros: registrosActual, incidencias: incidenciasActual },
    anterior: { registros: registrosAnterior, incidencias: incidenciasAnterior },
    mesesEnPeriodo,
    metaUtilizacionPorcentaje: metas.metaUtilizacionPorcentaje,
    metaPoolPorcentaje: metas.metaPoolPorcentaje,
    metaAsignadoPorcentaje: metas.metaAsignadoPorcentaje,
  });

  // --- Composición (sección 3) ---
  const composicionActual = calcularComposicionFlotilla(vehiculosFlotaFiltrados);
  const composicionPorTerritorio = calcularComposicionPorDimension(vehiculosFlotaFiltrados, (v) => v.territorioId).map((fila) => ({
    ...fila,
    clave: fila.clave,
    nombre: nombreTerritorio(fila.clave),
  }));
  const composicionPorTipoVehiculo = calcularComposicionPorDimension(vehiculosFlotaFiltrados, (v) => v.tipoVehiculo).map((fila) => ({
    ...fila,
    nombre: fila.clave,
  }));
  const registrosHistoricosFlotilla = registrosHistoricos.filter((r) => r.completado && r.vehiculoId);
  const evolucionComposicion = calcularEvolucionMensualComposicion(registrosHistoricosFlotilla, ANALITICA_CONFIG.mesesHistoricos, ahora);

  const composicion: SeccionComposicionDashboard = {
    actual: composicionActual,
    metaPoolPorcentaje: metas.metaPoolPorcentaje,
    metaAsignadoPorcentaje: metas.metaAsignadoPorcentaje,
    evolucionMensual: evolucionComposicion,
    porTerritorio: composicionPorTerritorio,
    porTipoVehiculo: composicionPorTipoVehiculo,
  };

  // --- Costo por km (sección 4) ---
  const registrosActualCompletados = registrosActual.filter((r) => r.completado);
  const costoPorAlternativa = calcularCostoPorKmPorAlternativa(registrosActualCompletados);
  const costoPorKm: SeccionCostoPorKmDashboard = {
    porAlternativa: costoPorAlternativa,
    evolucionMensual: calcularEvolucionMensualCostoPorKm(registrosHistoricos.filter((r) => r.completado), ANALITICA_CONFIG.mesesHistoricos, ahora),
    porTerritorio: calcularCostoPorKmPorDimension(registrosActualCompletados, (r) => r.territorioId).map((fila) => ({ ...fila, nombre: nombreTerritorio(fila.clave) })),
    porTipoVehiculo: calcularCostoPorKmPorDimension(
      registrosActualCompletados.filter((r): r is typeof r & { tipoVehiculo: TipoVehiculo } => !!r.tipoVehiculo),
      (r) => r.tipoVehiculo as string
    ).map((fila) => ({ ...fila, nombre: fila.clave })),
    porTipoViaje: calcularCostoPorKmPorDimension(registrosActualCompletados, (r) => r.tipoViaje).map((fila) => ({ ...fila, nombre: fila.clave })),
  };

  // --- Utilización (sección 5) ---
  const registrosActualFlotillaCompletados = registrosActualCompletados.filter((r) => r.vehiculoId);
  const resumenUtilizacion = calcularUtilizacionFlotilla(vehiculosParaUtilizacion, registrosActualFlotillaCompletados, mesesEnPeriodo);
  const utilizacionPorTerritorio = calcularUtilizacionPorTerritorio(vehiculosParaUtilizacion, registrosActualFlotillaCompletados, mesesEnPeriodo).map(
    (fila) => ({ ...fila, nombre: nombreTerritorio(fila.territorioId) })
  );
  const evolucionUtilizacion = construirSerieMensual(registrosHistoricosFlotilla, (r) => r.fecha, ANALITICA_CONFIG.mesesHistoricos, ahora, (grupo) => {
    const resumenMes = calcularUtilizacionFlotilla(vehiculosParaUtilizacion, grupo, 1);
    const valores = resumenMes.porVehiculo.map((v) => v.utilizacionPorcentaje);
    return { utilizacionPromedio: valores.length > 0 ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10 : null };
  });

  const utilizacion: SeccionUtilizacionDashboard = {
    resumen: resumenUtilizacion,
    porTerritorio: utilizacionPorTerritorio,
    evolucionMensual: evolucionUtilizacion,
    umbralMinimoViajesPorMes: ANALITICA_CONFIG.utilizacion.minimoViajesPorMes,
    umbralMaximoViajesPorMes: ANALITICA_CONFIG.utilizacion.maximoViajesPorMes,
  };

  // --- Ahorro (sección 6) ---
  const resultadoAhorro = calcularAhorros(construirViajesParaAhorro(registrosActualCompletados));
  const ahorroPorTerritorio = calcularAhorroPorGrupo(registrosActualCompletados, (r) => r.territorioId).map((g) => ({
    territorioId: g.clave,
    nombre: nombreTerritorio(g.clave),
    ahorro: g.ahorro,
  }));
  const evolucionAhorro = calcularEvolucionMensualAhorro(registrosHistoricos.filter((r) => r.completado), ANALITICA_CONFIG.mesesHistoricos, ahora);
  const ahorroTotalNumero = !esResultadoSinDatos(resultadoAhorro) ? resultadoAhorro.ahorroTotal : null;

  const ahorro: SeccionAhorroDashboard = {
    resultado: resultadoAhorro,
    porTerritorio: ahorroPorTerritorio,
    evolucionMensual: evolucionAhorro,
    ahorroPromedioPorViaje: ahorroTotalNumero !== null ? calcularAhorroPromedioPorViaje(ahorroTotalNumero, registrosActualCompletados.length) : null,
    roiEstimadoPorcentaje: ahorroTotalNumero !== null ? calcularRoiEstimado(ahorroTotalNumero, ANALITICA_CONFIG.costoImplementacionEstimadoMx) : null,
  };

  // --- Emisiones (sección 7) ---
  const emisiones = calcularSeccionEmisiones(registrosActualCompletados, registrosHistoricos.filter((r) => r.completado), ANALITICA_CONFIG.mesesHistoricos, ahora);

  // --- Matriz, rankings, extremos (sección 8) ---
  const matrizComparativa = calcularMatrizComparativa(costoPorAlternativa, emisiones.porAlternativa, resumenUtilizacion);
  const rankingTerritoriosPorAhorro = calcularRankingTerritoriosPorAhorro(ahorroPorTerritorio.map((f) => ({ clave: f.territorioId, ahorro: f.ahorro }))).map((fila) => ({
    ...fila,
    nombre: nombreTerritorio(fila.territorioId),
  }));
  const rankingUnidadesSubutilizadas = calcularRankingUnidadesSubutilizadas(resumenUtilizacion.porVehiculo);
  const vehiculosExtremos = calcularVehiculosExtremos(resumenUtilizacion.porVehiculo);
  const incidenciasDelPeriodo = incidenciasParaVehiculos(incidencias, vehiculosFlotaFiltrados, periodoInicio, periodoFin);
  const incidenciasPorCategoria = calcularIncidenciasPorCategoria(incidenciasDelPeriodo);

  // --- Recomendaciones (sección 9) ---
  const costoPorVehiculo = calcularCostoPorKmPorVehiculo(
    vehiculosFlotaFiltrados.map((v) => ({ id: v.id, nombre: nombreVehiculo(v) })),
    registrosActualFlotillaCompletados
  );
  const recomendaciones = generarRecomendaciones({
    composicion: composicionActual,
    metaPoolPorcentaje: metas.metaPoolPorcentaje,
    porVehiculoUtilizacion: resumenUtilizacion.porVehiculo,
    porTerritorioUtilizacion: utilizacionPorTerritorio,
    costoPorAlternativa,
    costoPorVehiculo,
    registrosCompletados: registrosActualCompletados,
  });

  return {
    kpis,
    composicion,
    costoPorKm,
    utilizacion,
    ahorro,
    emisiones,
    matrizComparativa,
    rankingTerritoriosPorAhorro,
    rankingUnidadesSubutilizadas,
    vehiculosExtremos,
    incidenciasPorCategoria,
    recomendaciones,
    opcionesFiltro: construirOpcionesFiltro(vehiculos, usuarios, registros),
    filtrosAplicados: filtros,
    periodo: { inicio: periodoInicio, fin: periodoFin, mesesEnPeriodo },
  };
}

function incidenciasParaVehiculos(
  incidencias: { vehiculoId: string; fechaCreacion: string; tipoIncidencia: TipoIncidencia }[],
  vehiculosFlota: Vehiculo[],
  inicio: Date,
  fin: Date
): { tipoIncidencia: TipoIncidencia }[] {
  const idsFlota = new Set(vehiculosFlota.map((v) => v.id));
  return incidencias
    .filter((i) => idsFlota.has(i.vehiculoId))
    .filter((i) => {
      const fecha = new Date(i.fechaCreacion).getTime();
      return fecha >= inicio.getTime() && fecha < fin.getTime();
    })
    .map((i) => ({ tipoIncidencia: i.tipoIncidencia }));
}

const TIPOS_VEHICULO: TipoVehiculo[] = ["sedan-compacto", "sedan-ejecutivo", "suv-asignado"];
const COMBUSTIBLES: TipoCombustible[] = ["GASOLINA", "DIESEL", "ELECTRICO", "HIBRIDO"];
const MODALIDADES_FLOTA: ModalidadVehiculo[] = ["POOL", "ASIGNADO"];
const MEDIOS_TRANSPORTE: ModalidadVehiculo[] = ["POOL", "ASIGNADO", "UBER"];

function construirOpcionesFiltro(vehiculos: Vehiculo[], usuarios: Usuario[], registros: RegistroViaje[]): OpcionesFiltroAnalitica {
  const territorioIds = Array.from(new Set(vehiculos.map((v) => v.territorioId)));
  return {
    territorios: territorioIds.map((id) => ({ id, nombre: nombreTerritorio(id) })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    modalidades: MODALIDADES_FLOTA,
    tiposVehiculo: TIPOS_VEHICULO,
    combustibles: COMBUSTIBLES,
    mediosTransporte: MEDIOS_TRANSPORTE,
    areas: Array.from(new Set(usuarios.map((u) => u.area).filter((a): a is string => !!a))).sort(),
    tiposViaje: Array.from(new Set(registros.map((r) => r.tipoViaje))).sort(),
  };
}
