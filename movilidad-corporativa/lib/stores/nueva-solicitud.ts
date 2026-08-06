import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Alternativa, TipoVehiculo } from "@/lib/services/types";

/**
 * Borrador del wizard de nueva solicitud. Se guarda como string en los
 * campos numéricos/fecha porque alimentan inputs controlados; se parsean y
 * validan con Zod al avanzar de paso (ver schema.ts).
 */
export interface DatosViajeBorrador {
  territorio: string;
  origen: string;
  destino: string;
  fechaSalida: string; // yyyy-MM-dd
  horaSalida: string; // HH:mm
  fechaRegreso: string; // yyyy-MM-dd
  horaRegreso: string; // HH:mm
  distanciaEstimadaKm: string;
  pasajeros: string;
  motivoViaje: string;
  tipoVehiculoRequerido: TipoVehiculo | "";
  necesidadesEspeciales: string;
  transportaEquipo: boolean;
}

export type PasoWizard = 1 | 2 | 3 | "exito";

export interface ResultadoExitoSolicitud {
  folio: string;
  solicitudId: string;
  estado: "ASIGNADA" | "PENDIENTE_APROBACION";
  vehiculoAsignadoNombre?: string;
}

function datosIniciales(territorioActivo: string): DatosViajeBorrador {
  return {
    territorio: territorioActivo,
    origen: "",
    destino: "",
    fechaSalida: "",
    horaSalida: "",
    fechaRegreso: "",
    horaRegreso: "",
    distanciaEstimadaKm: "",
    pasajeros: "1",
    motivoViaje: "",
    tipoVehiculoRequerido: "",
    necesidadesEspeciales: "",
    transportaEquipo: false,
  };
}

interface NuevaSolicitudStore {
  paso: PasoWizard;
  datos: DatosViajeBorrador;
  distanciaEditadaManualmente: boolean;
  alternativaSeleccionada: Alternativa | null;
  resultadoExito: ResultadoExitoSolicitud | null;
  setDatos: (patch: Partial<DatosViajeBorrador>) => void;
  marcarDistanciaEditadaManualmente: () => void;
  irAPaso: (paso: 1 | 2 | 3) => void;
  setAlternativaSeleccionada: (alternativa: Alternativa) => void;
  completarConExito: (resultado: ResultadoExitoSolicitud) => void;
  reiniciar: (territorioActivo: string) => void;
}

export const useNuevaSolicitudStore = create<NuevaSolicitudStore>()(
  persist(
    (set) => ({
      paso: 1,
      datos: datosIniciales("territorio-cdmx"),
      distanciaEditadaManualmente: false,
      alternativaSeleccionada: null,
      resultadoExito: null,
      setDatos: (patch) => set((state) => ({ datos: { ...state.datos, ...patch } })),
      marcarDistanciaEditadaManualmente: () => set({ distanciaEditadaManualmente: true }),
      irAPaso: (paso) => set({ paso }),
      setAlternativaSeleccionada: (alternativa) => set({ alternativaSeleccionada: alternativa }),
      completarConExito: (resultado) => set({ paso: "exito", resultadoExito: resultado }),
      reiniciar: (territorioActivo) =>
        set({
          paso: 1,
          datos: datosIniciales(territorioActivo),
          distanciaEditadaManualmente: false,
          alternativaSeleccionada: null,
          resultadoExito: null,
        }),
    }),
    {
      name: "movilidad-nueva-solicitud",
      storage: typeof window !== "undefined" ? createJSONStorage(() => localStorage) : undefined,
    }
  )
);
