export function calcularAhorroGenerado(
  costoBaseEstimado: number,
  costoRealOptimizado: number,
): number {
  return Math.max(costoBaseEstimado - costoRealOptimizado, 0);
}
