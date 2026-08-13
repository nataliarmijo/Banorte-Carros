/**
 * runtimeConfig — punto único de verdad para los parámetros de negocio del
 * proyecto (/administracion, Chunk 17).
 *
 * Los módulos de /lib/config siguen siendo la ÚNICA fuente que el resto del
 * código importa (PARAMS_CONFIG, COSTOS_CONFIG, EMISIONES_CONFIG,
 * ASIGNACION_CONFIG, ANALITICA_CONFIG, CHECKOUT_CONFIG, metasGerenciales):
 * ningún servicio ni adaptador necesita cambiar. Lo que agrega este módulo
 * es persistencia: cada sección editable se guarda en Dexie
 * (`parametrosOperativos`) y, al aplicarse, MUTA en el mismo lugar los
 * objetos ya exportados por esos módulos (nunca los reasigna), así que
 * cualquier vista que lea `PARAMS_CONFIG.horarioLaboral.horaInicio` (por
 * ejemplo) ve el valor editado en su siguiente render sin que nadie más
 * tenga que cambiar su código.
 *
 * `PARAMS_CONFIG.territorios` se administra aquí también (sección
 * "territorios"): es la fuente que de hecho consumen todas las vistas para
 * mostrar el nombre de un territorio (la tabla `db.territorios` del Chunk 2
 * sólo se usa para el conteo de registros de /administracion).
 */

import { db } from "@/lib/repositories/dexie";
import { parametrosOperativosRepository, registrosAuditoriaRepository } from "@/lib/repositories/typed-repositories";
import { PARAMS_CONFIG } from "./params";
import { COSTOS_CONFIG, type ConfigVehiculo, type TipoCombustible } from "./costos";
import { EMISIONES_CONFIG, type FactorEmision as ConfigFactorEmision } from "./emisiones";
import { ASIGNACION_CONFIG } from "./asignacion";
import { ANALITICA_CONFIG } from "./analitica";
import { CHECKIN_CONFIG } from "./checkin";
import { CHECKOUT_CONFIG } from "./checkout";
import { metasGerenciales, type MetaGerencialConfig } from "./metas";
import type { TipoVehiculo } from "@/lib/services/types";
import type { ModalidadVehiculo } from "@/lib/models";
import { crearResultadoSinDatos } from "@/lib/services/types";
import type { ResultadoSinDatos } from "@/lib/services/types";

// ---------------------------------------------------------------------------
// Helpers genéricos de mutación en sitio y diff (para el registro de auditoría)
// ---------------------------------------------------------------------------
function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Copia cada campo de `nuevo` sobre `objetivo`, recursivamente para objetos
 * anidados, preservando la identidad del objeto en cada nivel. No elimina
 * campos ausentes en `nuevo`: quien llama a `guardarSeccionConfiguracion`
 * siempre debe enviar el valor completo de la sección (los formularios se
 * precargan desde `obtenerActual()`), nunca un parche parcial.
 */
function mutarEnSitio(objetivo: object, nuevo: object): void {
  const destino = objetivo as Record<string, unknown>;
  const origen = nuevo as Record<string, unknown>;
  for (const clave of Object.keys(origen)) {
    const valorNuevo = origen[clave];
    const valorActual = destino[clave];
    if (esObjetoPlano(valorNuevo) && esObjetoPlano(valorActual)) {
      mutarEnSitio(valorActual, valorNuevo);
    } else {
      destino[clave] = valorNuevo;
    }
  }
}

export interface DiferenciaCampo {
  campo: string;
  valorAnterior: unknown;
  valorNuevo: unknown;
}

/** Diferencias campo por campo entre dos valores (recursivo en objetos planos; arreglos se comparan como un solo campo). */
export function diferenciasCampos(anterior: unknown, nuevo: unknown, prefijo = ""): DiferenciaCampo[] {
  if (esObjetoPlano(anterior) && esObjetoPlano(nuevo)) {
    const claves = new Set([...Object.keys(anterior), ...Object.keys(nuevo)]);
    const diffs: DiferenciaCampo[] = [];
    for (const clave of claves) {
      diffs.push(...diferenciasCampos(anterior[clave], nuevo[clave], prefijo ? `${prefijo}.${clave}` : clave));
    }
    return diffs;
  }
  if (JSON.stringify(anterior) === JSON.stringify(nuevo)) return [];
  return [{ campo: prefijo || "valor", valorAnterior: anterior, valorNuevo: nuevo }];
}

// ---------------------------------------------------------------------------
// Tipos de cada sección editable
// ---------------------------------------------------------------------------
export interface ValorHorarioLaboral {
  horaInicio: number;
  horaFin: number;
  diasLaborales: number[];
}

export interface ValorLimitesCostoEspecial {
  colaborador: number;
  aprobador: number;
  ejecutivo: number;
}

export interface ValorAsignacionPesos {
  compatibilidad: number;
  proximidad: number;
  utilizacion: number;
  balanceKilometraje: number;
  riesgoMantenimiento: number;
  incidencias: number;
}

export interface ValorUberConfig {
  tarifaBase: number;
  costoKm: number;
  costoMinuto: number;
  costoAdministrativoManual: number;
  supuestoCasetas: number;
  factorDemanda: { horarioNormal: number; horarioPico: number; finDeSemana: number };
  rangosPico: { horaInicio: number; horaFin: number }[];
}

export type ValorCostosVehiculos = Record<TipoVehiculo, ConfigVehiculo>;

export interface ValorEmisionesConfig {
  combustibles: Record<TipoCombustible, ConfigFactorEmision>;
  multiplicadoresPorTipo: Record<TipoVehiculo, number>;
  uber: { gCO2PorKm: number; descripcion: string };
  escenarioBase: { gCO2PorKm: number; descripcion: string };
}

export interface ValorEscenarioBaseAhorros {
  modalidadPorDefecto: ModalidadVehiculo;
  tipoVehiculoPorDefecto: TipoVehiculo;
  incluyeCoordinacionManual: boolean;
  descripcion: string;
}

export type ValorMetasGerenciales = MetaGerencialConfig[];

export interface ValorAnaliticaMetas {
  metaFlotaTotalUnidades: number;
  metaPoolPorcentaje: number;
  metaAsignadoPorcentaje: number;
  metaUtilizacionPorDefecto: number;
  utilizacion: { minimoViajesPorMes: number; maximoViajesPorMes: number };
  metaTasaAprobacionPorcentaje: number;
  metaMaximaUsoFueraDeHorarioPorcentaje: number;
  metaMaximaIncidenciasPorCadaCienViajes: number;
  costoImplementacionEstimadoMx: number;
  horasAhorradasPorViajeDigitalizado: number;
  mesesHistoricos: number;
}

export interface ValorCheckoutConfig {
  fotosMinimas: number;
  consumoEsperadoPorcentajePor100Km: number;
}

export interface ValorCheckinConfig {
  ventanaPreviaHoras: number;
  kilometrajeExcedenteRazonableKm: number;
  combustible: { minimoPorcentaje: number; maximoPorcentaje: number };
  fotosMinimas: number;
}

export interface ValorParametrosGenerales {
  porcentajeTolerancia: number;
  margenUberRecomendacion: number;
  casetas: { porcentajePorKm: number; minimo: number };
  estacionamiento: { costoPorMinuto: number; minutosEstimadosPorDefecto: number };
  entregaRecepcion: { minutosEstimados: number };
  duracionEstimadaMinutosPorDefecto: number;
  umbralUrgenciaAprobacionHoras: number;
  saturacionFlotilla: { umbralAltoPorcentaje: number; umbralModeradoPorcentaje: number };
}

export type ValorTerritorios = Record<string, { nombre: string; latitud: number; longitud: number }>;

export type ClaveSeccionConfig =
  | "horarioLaboral"
  | "limitesCostoEspecial"
  | "asignacionPesos"
  | "uberConfig"
  | "costosVehiculos"
  | "emisionesConfig"
  | "escenarioBaseAhorros"
  | "metasGerenciales"
  | "analiticaMetas"
  | "checkinConfig"
  | "checkoutConfig"
  | "parametrosGenerales"
  | "territorios";

interface DefinicionSeccion {
  clave: ClaveSeccionConfig;
  titulo: string;
  descripcion: string;
  /** Sólo lectura para Ejecutivo/Gerente (siguen siendo editables por Admin Flota). */
  soloLecturaParaEjecutivo: boolean;
  obtenerActual: () => unknown;
  aplicar: (valor: unknown) => void;
  /** Devuelve un mensaje de error si el valor propuesto es inválido; null si es válido. */
  validar?: (valor: unknown) => string | null;
}

function aplicarObjeto<T extends object>(objetivo: T): (valor: unknown) => void {
  return (valor: unknown) => mutarEnSitio(objetivo, valor as object);
}

const SECCIONES: DefinicionSeccion[] = [
  {
    clave: "horarioLaboral",
    titulo: "Horario laboral y fin de semana",
    descripcion: "Usado por el check-out (Chunk 10) y las alertas de uso fuera de horario (Chunk 14).",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => PARAMS_CONFIG.horarioLaboral,
    aplicar: aplicarObjeto(PARAMS_CONFIG.horarioLaboral),
    validar: (valor) => {
      const v = valor as ValorHorarioLaboral;
      if (v.horaInicio < 0 || v.horaInicio > 23 || v.horaFin < 0 || v.horaFin > 23) return "Las horas deben estar entre 0 y 23.";
      if (v.horaInicio >= v.horaFin) return "La hora de inicio debe ser menor a la hora de fin.";
      if (!Array.isArray(v.diasLaborales) || v.diasLaborales.length === 0) return "Selecciona al menos un día laboral.";
      if (v.diasLaborales.some((d) => d < 0 || d > 6)) return "Los días laborales deben estar entre 0 (domingo) y 6 (sábado).";
      return null;
    },
  },
  {
    clave: "limitesCostoEspecial",
    titulo: "Límite de costo para aprobación especial",
    descripcion: "Costo (MXN) a partir del cual una solicitud requiere aprobación especial (Chunk 4/6/8).",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => PARAMS_CONFIG.limitesCostoEspecial,
    aplicar: aplicarObjeto(PARAMS_CONFIG.limitesCostoEspecial),
    validar: (valor) => {
      const v = valor as ValorLimitesCostoEspecial;
      if (v.colaborador <= 0 || v.aprobador <= 0 || v.ejecutivo <= 0) return "Los límites deben ser mayores a cero.";
      return null;
    },
  },
  {
    clave: "asignacionPesos",
    titulo: "Pesos del motor de asignación",
    descripcion: "Ponderación de cada criterio del motor de asignación inteligente (Chunk 5); deben sumar 100%.",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => ASIGNACION_CONFIG.pesos,
    aplicar: aplicarObjeto(ASIGNACION_CONFIG.pesos),
    validar: (valor) => {
      const v = valor as ValorAsignacionPesos;
      const sumaTotal = v.compatibilidad + v.proximidad + v.utilizacion + v.balanceKilometraje + v.riesgoMantenimiento + v.incidencias;
      return Math.abs(sumaTotal - 1) < 1e-9 ? null : `Los pesos deben sumar 100% (suman ${Math.round(sumaTotal * 1000) / 10}%).`;
    },
  },
  {
    clave: "uberConfig",
    titulo: "Tarifas de Uber y factor de demanda",
    descripcion: "Tarifa base, costo por km/minuto y factores de demanda usados por servicioCostos (Chunk 4).",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => ({
      tarifaBase: COSTOS_CONFIG.uber.tarifaBase,
      costoKm: COSTOS_CONFIG.uber.costoKm,
      costoMinuto: COSTOS_CONFIG.uber.costoMinuto,
      costoAdministrativoManual: COSTOS_CONFIG.uber.costoAdministrativoManual,
      supuestoCasetas: COSTOS_CONFIG.uber.supuestoCasetas,
      factorDemanda: PARAMS_CONFIG.factorDemandaUber,
      rangosPico: PARAMS_CONFIG.factorDemandaUber.rangosPico,
    }),
    aplicar: (valor) => {
      const v = valor as ValorUberConfig;
      mutarEnSitio(COSTOS_CONFIG.uber, {
        tarifaBase: v.tarifaBase,
        costoKm: v.costoKm,
        costoMinuto: v.costoMinuto,
        costoAdministrativoManual: v.costoAdministrativoManual,
        supuestoCasetas: v.supuestoCasetas,
      });
      mutarEnSitio(PARAMS_CONFIG.factorDemandaUber, { ...v.factorDemanda, rangosPico: v.rangosPico });
    },
    validar: (valor) => {
      const v = valor as ValorUberConfig;
      if (v.tarifaBase < 0 || v.costoKm < 0 || v.costoMinuto < 0 || v.supuestoCasetas < 0) return "Las tarifas no pueden ser negativas.";
      if (!Array.isArray(v.rangosPico)) return "Los rangos de horario pico son inválidos.";
      return null;
    },
  },
  {
    clave: "costosVehiculos",
    titulo: "Costos por tipo de vehículo (combustible, mantenimiento, fijos)",
    descripcion: "Precio de combustible, rendimiento y costos fijos amortizados por km, usados por servicioCostos (Chunk 4).",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => COSTOS_CONFIG.vehiculos,
    aplicar: aplicarObjeto(COSTOS_CONFIG.vehiculos),
  },
  {
    clave: "emisionesConfig",
    titulo: "Factores de emisión de CO₂",
    descripcion: "Factores por combustible, multiplicadores por tipo de vehículo y emisión de Uber, usados por servicioEmisiones (Chunk 4).",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => EMISIONES_CONFIG,
    aplicar: aplicarObjeto(EMISIONES_CONFIG),
  },
  {
    clave: "escenarioBaseAhorros",
    titulo: "Supuestos del escenario base de ahorro",
    descripcion: "Qué hubiera pasado sin el programa de movilidad; usado por servicioAhorros (Chunk 4) y el dashboard ejecutivo (Chunk 15).",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => PARAMS_CONFIG.escenarioBaseAhorros,
    aplicar: aplicarObjeto(PARAMS_CONFIG.escenarioBaseAhorros),
    validar: (valor) => {
      const v = valor as ValorEscenarioBaseAhorros;
      if (v.modalidadPorDefecto !== "POOL" && v.modalidadPorDefecto !== "ASIGNADO") return "La modalidad por defecto debe ser Pool o Asignado.";
      return null;
    },
  },
  {
    clave: "metasGerenciales",
    titulo: "Metas gerenciales por territorio",
    descripcion: "% Pool objetivo, utilización esperada y meta de ahorro mensual por territorio; usadas en el dashboard ejecutivo (Chunk 15).",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => metasGerenciales,
    aplicar: (valor) => {
      const v = valor as ValorMetasGerenciales;
      metasGerenciales.length = 0;
      metasGerenciales.push(...v);
    },
  },
  {
    clave: "analiticaMetas",
    titulo: "Metas y umbrales del dashboard ejecutivo",
    descripcion: "Meta global Pool/Asignado, umbrales de sub/sobreutilización y demás parámetros de /analitica (Chunk 15).",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => ANALITICA_CONFIG,
    aplicar: aplicarObjeto(ANALITICA_CONFIG),
  },
  {
    clave: "checkinConfig",
    titulo: "Reglas de check-in",
    descripcion: "Ventana previa habilitada, kilometraje excedente razonable y fotografías mínimas, usados por el check-in digital (Chunk 9).",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => CHECKIN_CONFIG,
    aplicar: aplicarObjeto(CHECKIN_CONFIG),
  },
  {
    clave: "checkoutConfig",
    titulo: "Reglas de check-out",
    descripcion: "Fotografías mínimas y consumo esperado de combustible, usados por el check-out digital (Chunk 10).",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => CHECKOUT_CONFIG,
    aplicar: aplicarObjeto(CHECKOUT_CONFIG),
  },
  {
    clave: "parametrosGenerales",
    titulo: "Parámetros generales de costos",
    descripcion: "Tolerancia de comparación, casetas, estacionamiento y duración estimada por defecto (Chunk 4).",
    soloLecturaParaEjecutivo: true,
    obtenerActual: () => ({
      porcentajeTolerancia: PARAMS_CONFIG.porcentajeTolerancia,
      margenUberRecomendacion: PARAMS_CONFIG.margenUberRecomendacion,
      casetas: PARAMS_CONFIG.casetas,
      estacionamiento: PARAMS_CONFIG.estacionamiento,
      entregaRecepcion: PARAMS_CONFIG.entregaRecepcion,
      duracionEstimadaMinutosPorDefecto: PARAMS_CONFIG.duracionEstimadaMinutosPorDefecto,
      umbralUrgenciaAprobacionHoras: PARAMS_CONFIG.umbralUrgenciaAprobacionHoras,
      saturacionFlotilla: PARAMS_CONFIG.saturacionFlotilla,
    }),
    aplicar: (valor) => {
      const v = valor as ValorParametrosGenerales;
      (PARAMS_CONFIG as unknown as Record<string, unknown>).porcentajeTolerancia = v.porcentajeTolerancia;
      (PARAMS_CONFIG as unknown as Record<string, unknown>).margenUberRecomendacion = v.margenUberRecomendacion;
      (PARAMS_CONFIG as unknown as Record<string, unknown>).duracionEstimadaMinutosPorDefecto = v.duracionEstimadaMinutosPorDefecto;
      (PARAMS_CONFIG as unknown as Record<string, unknown>).umbralUrgenciaAprobacionHoras = v.umbralUrgenciaAprobacionHoras;
      mutarEnSitio(PARAMS_CONFIG.casetas, v.casetas);
      mutarEnSitio(PARAMS_CONFIG.estacionamiento, v.estacionamiento);
      mutarEnSitio(PARAMS_CONFIG.entregaRecepcion, v.entregaRecepcion);
      mutarEnSitio(PARAMS_CONFIG.saturacionFlotilla, v.saturacionFlotilla);
    },
  },
  {
    clave: "territorios",
    titulo: "Territorios",
    descripcion: "Nombre y coordenadas de referencia de cada territorio; fuente que consumen todas las vistas de la app.",
    soloLecturaParaEjecutivo: false,
    obtenerActual: () => PARAMS_CONFIG.territorios,
    aplicar: aplicarObjeto(PARAMS_CONFIG.territorios),
  },
];

export function listarDefinicionesSecciones(): Omit<DefinicionSeccion, "aplicar" | "validar">[] {
  return SECCIONES.map(({ clave, titulo, descripcion, soloLecturaParaEjecutivo, obtenerActual }) => ({
    clave,
    titulo,
    descripcion,
    soloLecturaParaEjecutivo,
    obtenerActual,
  }));
}

function obtenerDefinicion(clave: ClaveSeccionConfig): DefinicionSeccion {
  const definicion = SECCIONES.find((s) => s.clave === clave);
  if (!definicion) throw new Error(`Sección de configuración desconocida: ${clave}`);
  return definicion;
}

// ---------------------------------------------------------------------------
// Valores de fábrica: se capturan UNA sola vez, al evaluarse este módulo
// (antes de que cualquier acción de /administracion pueda mutar nada), para
// que "Restablecer datos demo" pueda regresar a ellos con certeza, incluso
// después de que la sesión actual ya haya guardado otros valores.
// ---------------------------------------------------------------------------
const VALORES_POR_DEFECTO = new Map<ClaveSeccionConfig, unknown>(
  SECCIONES.map((seccion) => [seccion.clave, JSON.parse(JSON.stringify(seccion.obtenerActual()))])
);

// ---------------------------------------------------------------------------
// Sincronización con Dexie: siembra los valores por defecto la primera vez,
// y aplica (en memoria) cualquier override ya guardado en cada arranque.
// ---------------------------------------------------------------------------
export async function sincronizarConfiguracionPersistida(): Promise<void> {
  const filas = await db.parametrosOperativos.toArray();
  const filaPorClave = new Map(filas.map((f) => [f.clave, f]));
  const ahora = new Date().toISOString();

  for (const seccion of SECCIONES) {
    const fila = filaPorClave.get(seccion.clave);
    if (fila) {
      try {
        const valorPersistido = JSON.parse(fila.valorJson);
        if (!esObjetoPlano(valorPersistido) && !Array.isArray(valorPersistido)) {
          throw new Error(`Valor persistido inválido para "${seccion.clave}"`);
        }
        seccion.aplicar(valorPersistido);
      } catch {
        // Fila corrupta (p. ej. de una versión anterior o un guardado
        // incompleto): usa el valor de fábrica en memoria en vez de tumbar
        // el arranque de toda la app. La fila corrupta se sobreescribe la
        // próxima vez que se guarde esta sección desde /administracion.
        seccion.aplicar(JSON.parse(JSON.stringify(VALORES_POR_DEFECTO.get(seccion.clave))));
      }
    } else {
      const valorPorDefecto = VALORES_POR_DEFECTO.get(seccion.clave);
      seccion.aplicar(JSON.parse(JSON.stringify(valorPorDefecto)));
      await parametrosOperativosRepository.create({
        id: crypto.randomUUID(),
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
        usuarioCreadorId: "user-admin",
        estatus: "ACTIVO",
        clave: seccion.clave,
        valorJson: JSON.stringify(valorPorDefecto),
        descripcion: seccion.descripcion,
      });
    }
  }
}

/** Restaura en memoria todos los parámetros a su valor de fábrica y borra los overrides persistidos. Usado por "Restablecer datos demo". */
export async function restablecerConfiguracionADefecto(): Promise<void> {
  for (const seccion of SECCIONES) {
    seccion.aplicar(JSON.parse(JSON.stringify(VALORES_POR_DEFECTO.get(seccion.clave))));
  }
  await db.parametrosOperativos.clear();
}

// ---------------------------------------------------------------------------
// Guardar una sección: valida, aplica en memoria, persiste y audita.
// ---------------------------------------------------------------------------
export async function guardarSeccionConfiguracion(
  clave: ClaveSeccionConfig,
  nuevoValor: unknown,
  usuarioId: string
): Promise<{ diferencias: DiferenciaCampo[] } | ResultadoSinDatos> {
  const seccion = obtenerDefinicion(clave);
  const valorAnterior = JSON.parse(JSON.stringify(seccion.obtenerActual()));

  const error = seccion.validar?.(nuevoValor);
  if (error) return crearResultadoSinDatos(error);

  seccion.aplicar(nuevoValor);
  const valorAplicado = seccion.obtenerActual();

  const filaExistente = await db.parametrosOperativos.where("clave").equals(clave).first();
  const ahora = new Date().toISOString();
  if (filaExistente) {
    await parametrosOperativosRepository.update(filaExistente.id, {
      valorJson: JSON.stringify(valorAplicado),
      fechaActualizacion: ahora,
    });
  } else {
    await parametrosOperativosRepository.create({
      id: crypto.randomUUID(),
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
      usuarioCreadorId: usuarioId,
      estatus: "ACTIVO",
      clave,
      valorJson: JSON.stringify(valorAplicado),
      descripcion: seccion.descripcion,
    });
  }

  const diferencias = diferenciasCampos(valorAnterior, valorAplicado);
  for (const diferencia of diferencias) {
    await registrosAuditoriaRepository.create({
      id: crypto.randomUUID(),
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
      usuarioCreadorId: usuarioId,
      estatus: "ACTIVO",
      entidad: "ParametroOperativo",
      entidadId: clave,
      accion: "CAMBIO_PARAMETRO",
      usuarioId,
      cambiosJson: JSON.stringify(diferencia),
      fechaCambio: ahora,
    });
  }

  return { diferencias };
}
