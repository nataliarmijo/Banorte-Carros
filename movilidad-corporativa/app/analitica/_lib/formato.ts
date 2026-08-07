/** Formateadores de presentación para /analitica. Capa de UI, sin lógica de negocio. */

export function formatoMxn(valor: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(valor);
}

export function formatoNumero(valor: number, decimales = 0): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: decimales, minimumFractionDigits: decimales }).format(valor);
}

export function formatoPorcentaje(valor: number, decimales = 1): string {
  return `${formatoNumero(valor, decimales)}%`;
}

/** null/undefined -> "Sin datos suficientes"; en otro caso aplica el formateador dado. */
export function formatoOSinDatos(valor: number | null | undefined, formateador: (v: number) => string): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "Sin datos suficientes";
  return formateador(valor);
}

export function formatoUnidadKpi(valor: number, unidad: "numero" | "porcentaje" | "mxn" | "horas"): string {
  switch (unidad) {
    case "mxn":
      return formatoMxn(valor);
    case "porcentaje":
      return formatoPorcentaje(valor);
    case "horas":
      return `${formatoNumero(valor, 1)} h`;
    default:
      return formatoNumero(valor);
  }
}
