"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/states";
import { initializeDemoData } from "@/lib/seed/init";
import { db } from "@/lib/repositories/dexie";
import { useSessionStore } from "@/lib/stores/session";
import { crearVehiculo } from "@/lib/adapters/vehiculos";
import { esResultadoSinDatos } from "@/lib/services/types";
import { toast } from "@/lib/toast";
import { FormularioVehiculo, datosVehiculoIniciales, type DatosVehiculoBorrador } from "../_components/formulario-vehiculo";
import type { DatosVehiculoValidados } from "../_lib/schema";

export default function NuevoVehiculoPage() {
  const router = useRouter();
  const { usuarioActivo, territorioActivo } = useSessionStore();

  const [listo, setListo] = useState(false);
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([]);
  const [datos, setDatos] = useState<DatosVehiculoBorrador>(() => datosVehiculoIniciales(territorioActivo));
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [folioCreado, setFolioCreado] = useState<string | null>(null);

  useEffect(() => {
    initializeDemoData().then(async () => {
      const todosLosUsuarios = await db.usuarios.toArray();
      setUsuarios(todosLosUsuarios.map((u) => ({ id: u.id, nombre: u.nombreCompleto })));
      setListo(true);
    });
  }, []);

  async function manejarSubmit(validados: DatosVehiculoValidados) {
    if (!usuarioActivo) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const resultado = await crearVehiculo(
        {
          placa: validados.placa,
          marca: validados.marca,
          modelo: validados.modelo,
          anio: validados.anio,
          tipoVehiculo: validados.tipoVehiculo,
          modalidad: validados.modalidad,
          territorioId: validados.territorio,
          ubicacion: validados.ubicacion,
          capacidadPasajeros: validados.capacidadPasajeros,
          combustibleTipo: validados.combustibleTipo,
          kilometrajeActual: validados.kilometrajeActual,
          rendimientoKmPorLitro: validados.rendimientoKmPorLitro,
          costoPorKm: validados.costoPorKm,
          usuarioAsignadoId: validados.usuarioAsignadoId || undefined,
          proximaVerificacionFecha: validados.proximaVerificacionFecha || undefined,
        },
        usuarioActivo.id
      );

      if (esResultadoSinDatos(resultado)) {
        setErrorEnvio(resultado.detalle);
        toast.error("No se pudo crear el vehículo", resultado.detalle);
        return;
      }

      toast.success("Vehículo creado", resultado.placa);
      setFolioCreado(resultado.placa);
      setTimeout(() => router.push(`/vehiculos/${resultado.id}`), 1200);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "Ocurrió un error inesperado al crear el vehículo.";
      setErrorEnvio(mensaje);
      toast.error("No se pudo crear el vehículo", mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Link href="/vehiculos" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Vehículos</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Nuevo vehículo</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Registra una nueva unidad de la flotilla Pool o Asignado.
          </p>
        </section>

        {folioCreado && (
          <div className="flex items-center gap-2 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" /> Vehículo {folioCreado} creado correctamente. Redirigiendo a su ficha...
          </div>
        )}

        {!listo ? (
          <LoadingState message="Preparando el formulario..." />
        ) : (
          <FormularioVehiculo
            datos={datos}
            onDatosChange={(patch) => setDatos((d) => ({ ...d, ...patch }))}
            modoEdicion={false}
            usuariosParaAsignar={usuarios}
            onSubmit={manejarSubmit}
            enviando={enviando}
            errorEnvio={errorEnvio}
            textoBoton="Crear vehículo"
          />
        )}
      </div>
    </AppShell>
  );
}
