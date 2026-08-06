import { z } from "zod";
import { COSTOS_CONFIG } from "@/lib/config/costos";

export const schemaPaso1 = z
  .object({
    territorio: z.string().min(1, "Selecciona un territorio"),
    origen: z.string().trim().min(2, "Indica el punto de origen"),
    destino: z.string().trim().min(2, "Indica el destino"),
    fechaSalida: z.string().min(1, "Indica la fecha de salida"),
    horaSalida: z.string().min(1, "Indica la hora de salida"),
    fechaRegreso: z.string().min(1, "Indica la fecha de regreso"),
    horaRegreso: z.string().min(1, "Indica la hora de regreso"),
    distanciaEstimadaKm: z.coerce
      .number({ message: "Indica la distancia estimada" })
      .positive("La distancia debe ser mayor a 0"),
    pasajeros: z.coerce
      .number({ message: "Indica el número de pasajeros" })
      .int("El número de pasajeros debe ser un entero")
      .min(1, "Debe viajar al menos 1 pasajero"),
    motivoViaje: z.string().trim().min(3, "Describe el motivo del viaje"),
    tipoVehiculoRequerido: z.enum(["sedan-compacto", "sedan-ejecutivo", "suv-asignado"], {
      message: "Selecciona el tipo de vehículo requerido",
    }),
    necesidadesEspeciales: z.string().optional(),
    transportaEquipo: z.boolean(),
  })
  .refine((data) => `${data.fechaRegreso}T${data.horaRegreso}` >= `${data.fechaSalida}T${data.horaSalida}`, {
    message: "La fecha y hora de regreso no puede ser anterior a la salida",
    path: ["fechaRegreso"],
  })
  .refine(
    (data) => (COSTOS_CONFIG.vehiculos[data.tipoVehiculoRequerido]?.capacidadPersonas ?? 0) >= data.pasajeros,
    {
      message: "El tipo de vehículo seleccionado no tiene capacidad suficiente para el número de pasajeros",
      path: ["pasajeros"],
    }
  );

export type DatosPaso1Validados = z.infer<typeof schemaPaso1>;

export type ErroresPaso1 = Partial<Record<keyof DatosPaso1Validados, string>>;

export function validarPaso1(datos: unknown): { exito: true; datos: DatosPaso1Validados } | { exito: false; errores: ErroresPaso1 } {
  const resultado = schemaPaso1.safeParse(datos);
  if (resultado.success) {
    return { exito: true, datos: resultado.data };
  }

  const errores: ErroresPaso1 = {};
  for (const issue of resultado.error.issues) {
    const campo = issue.path[0] as keyof DatosPaso1Validados | undefined;
    if (campo && !errores[campo]) {
      errores[campo] = issue.message;
    }
  }
  return { exito: false, errores };
}
