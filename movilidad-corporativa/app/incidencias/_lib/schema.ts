import { z } from "zod";

export const schemaIncidencia = z.object({
  tipoIncidencia: z.enum([
    "DANOS",
    "ACCIDENTE",
    "RETRASO",
    "DIFERENCIA_COMBUSTIBLE",
    "USO_FUERA_DE_HORARIO",
    "FIN_DE_SEMANA_NO_AUTORIZADO",
    "DESVIACION_RUTA",
    "DOCUMENTACION_VENCIDA",
    "MANTENIMIENTO_VENCIDO",
  ], { message: "Selecciona el tipo de incidencia" }),
  severidad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"], { message: "Selecciona la severidad" }),
  vehiculoId: z.string().min(1, "Selecciona un vehículo"),
  reservacionId: z.string().optional(),
  descripcion: z.string().trim().min(5, "Describe la incidencia con más detalle"),
  responsableId: z.string().optional(),
  fechaCompromiso: z.string().optional(),
});

export type DatosIncidenciaValidados = z.infer<typeof schemaIncidencia>;
export type ErroresIncidencia = Partial<Record<keyof DatosIncidenciaValidados, string>>;

export function validarIncidencia(
  datos: unknown
): { exito: true; datos: DatosIncidenciaValidados } | { exito: false; errores: ErroresIncidencia } {
  const resultado = schemaIncidencia.safeParse(datos);
  if (resultado.success) {
    return { exito: true, datos: resultado.data };
  }

  const errores: ErroresIncidencia = {};
  for (const issue of resultado.error.issues) {
    const campo = issue.path[0] as keyof DatosIncidenciaValidados | undefined;
    if (campo && !errores[campo]) {
      errores[campo] = issue.message;
    }
  }
  return { exito: false, errores };
}
