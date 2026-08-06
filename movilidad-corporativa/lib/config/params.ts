/**
 * Configuración centralizada de parámetros base
 * Todos los valores pueden ser editados aquí sin tocar la lógica de negocio
 */

export const PARAMS_CONFIG = {
  // Horarios laborales (en horas 0-23)
  horarioLaboral: {
    horaInicio: 8,
    horaFin: 18,
    diasLaborales: [1, 2, 3, 4, 5], // 0=domingo, 1=lunes, ..., 5=viernes
  },

  // Límites de costo que requieren aprobación especial (en MXN)
  limitesCostoEspecial: {
    colaborador: 500,
    aprobador: 1000,
    ejecutivo: 2000,
  },

  // Factor de demanda para Uber (surge pricing estimado)
  // 1.0 = tarifa normal, 1.5 = 50% más caro (horas pico)
  factorDemandaUber: {
    horarioNormal: 1.0,
    horarioPico: 1.5,
    finDeSemana: 1.2,
    // Rangos de hora (0-23, fin exclusivo) considerados horario pico
    rangosPico: [
      { horaInicio: 7, horaFin: 10 },
      { horaInicio: 17, horaFin: 20 },
    ],
  },

  // Tolerancia para "similar o menor costo"
  porcentajeTolerancia: 0.05, // 5%

  // Margen mínimo para recomendar Uber
  margenUberRecomendacion: 0.1, // 10% más barato

  // Datos de territorios (distancia estimada, etc.)
  territorios: {
    "territorio-cdmx": { nombre: "CDMX", latitud: 19.4326, longitud: -99.1332 },
    "territorio-guadalajara": { nombre: "Guadalajara", latitud: 20.6596, longitud: -103.3496 },
    "territorio-monterrey": { nombre: "Monterrey", latitud: 25.6866, longitud: -100.3161 },
    "territorio-puebla": { nombre: "Puebla", latitud: 19.0327, longitud: -98.2314 },
    "territorio-queretaro": { nombre: "Querétaro", latitud: 20.5888, longitud: -100.3899 },
    "territorio-merida": { nombre: "Mérida", latitud: 20.9674, longitud: -89.6266 },
  },

  // Datos de casetas (peaje)
  casetas: {
    porcentajePorKm: 0.08, // 8% del costo km a aplicar por casetas (promedio nacional)
    minimo: 10, // MXN mínimo por viaje
  },

  // Estacionamiento estimado
  estacionamiento: {
    costoPorMinuto: 1.5, // MXN por minuto (tarifa mall/centro)
    minutosEstimadosPorDefecto: 30, // tiempo promedio de estancia si no se especifica duración
  },

  // Entrega/recepción del vehículo en el depósito (tramo sin pasajero)
  entregaRecepcion: {
    minutosEstimados: 30,
  },

  // Duración estimada por defecto de un viaje cuando no se especifica (para
  // prorratear estacionamiento, minutos de Uber, etc.)
  duracionEstimadaMinutosPorDefecto: 60,

  // Escenario base para el cálculo de ahorros: qué hubiera pasado sin el
  // programa de movilidad corporativa
  escenarioBaseAhorros: {
    modalidadPorDefecto: "ASIGNADO" as const,
    tipoVehiculoPorDefecto: "sedan-ejecutivo" as const,
    incluyeCoordinacionManual: true,
    descripcion:
      "Sin el programa de movilidad, todo viaje se resuelve con vehículo Asignado (sedán ejecutivo) y se coordina manualmente (llamadas/correos) por cada reservación.",
  },
} as const;
