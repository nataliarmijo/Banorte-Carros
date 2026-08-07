import { z } from "zod";

export const schemaVehiculo = z.object({
  placa: z
    .string()
    .trim()
    .min(5, "La placa debe tener al menos 5 caracteres")
    .max(10, "La placa es demasiado larga"),
  marca: z.string().trim().min(2, "Indica la marca"),
  modelo: z.string().trim().min(1, "Indica el modelo"),
  anio: z.coerce
    .number({ message: "Indica el año" })
    .int("El año debe ser un número entero")
    .min(2000, "El año no es válido")
    .max(new Date().getFullYear() + 1, "El año no es válido"),
  tipoVehiculo: z.string().trim().min(2, "Indica el tipo de vehículo"),
  modalidad: z.enum(["POOL", "ASIGNADO"], { message: "Selecciona la modalidad" }),
  territorio: z.string().min(1, "Selecciona un territorio"),
  ubicacion: z.string().trim().min(3, "Indica la ubicación"),
  capacidadPasajeros: z.coerce
    .number({ message: "Indica la capacidad" })
    .int("La capacidad debe ser un número entero")
    .min(1, "Debe tener capacidad para al menos 1 pasajero")
    .max(15, "Capacidad no válida"),
  combustibleTipo: z.string().trim().min(3, "Indica el tipo de combustible"),
  kilometrajeActual: z.coerce
    .number({ message: "Indica el kilometraje" })
    .min(0, "El kilometraje no puede ser negativo"),
  rendimientoKmPorLitro: z.coerce
    .number({ message: "Indica el rendimiento" })
    .min(0, "El rendimiento no puede ser negativo"),
  costoPorKm: z.coerce.number({ message: "Indica el costo por km" }).min(0, "El costo por km no puede ser negativo"),
  usuarioAsignadoId: z.string().optional(),
  proximaVerificacionFecha: z.string().optional(),
});

export type DatosVehiculoValidados = z.infer<typeof schemaVehiculo>;
export type ErroresVehiculo = Partial<Record<keyof DatosVehiculoValidados, string>>;

export function validarVehiculo(
  datos: unknown
): { exito: true; datos: DatosVehiculoValidados } | { exito: false; errores: ErroresVehiculo } {
  const resultado = schemaVehiculo.safeParse(datos);
  if (resultado.success) {
    return { exito: true, datos: resultado.data };
  }

  const errores: ErroresVehiculo = {};
  for (const issue of resultado.error.issues) {
    const campo = issue.path[0] as keyof DatosVehiculoValidados | undefined;
    if (campo && !errores[campo]) {
      errores[campo] = issue.message;
    }
  }
  return { exito: false, errores };
}
