/**
 * Paleta categórica fija para las 3 alternativas (Pool/Asignado/Uber) en
 * todas las gráficas de /analitica: los primeros 3 slots validados del
 * skill de dataviz (orden fijo, nunca ciclado; validan all-pairs en ambos
 * modos de contraste).
 */
export const COLOR_POOL = "#2a78d6";
export const COLOR_ASIGNADO = "#eb6834";
export const COLOR_UBER = "#1baf7a";

export const COLOR_POR_ALTERNATIVA: Record<"POOL" | "ASIGNADO" | "UBER", string> = {
  POOL: COLOR_POOL,
  ASIGNADO: COLOR_ASIGNADO,
  UBER: COLOR_UBER,
};

export const COLOR_GRIS_SECUNDARIO = "#898781";

/** Par emitido/evitado (magnitud, no identidad de alternativa): gris para lo emitido, verde éxito para lo evitado. */
export const COLOR_EMITIDO = "#898781";
export const COLOR_EVITADO = "#0ca30c";
