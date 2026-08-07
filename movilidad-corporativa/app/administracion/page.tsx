"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/repositories/dexie";
import { initializeDemoData, resetDemoData } from "@/lib/seed/init";
import { useSessionStore } from "@/lib/stores/session";
import {
  listarAuditoriaReciente,
  listarTerritoriosConConteos,
  listarUsuarios,
  type TerritorioConConteos,
  type UsuarioConTerritorio,
} from "@/lib/adapters/administracion";
import type { RegistroAuditoria } from "@/lib/models";
import { TabUsuarios } from "./_components/tab-usuarios";
import { TabTerritorios } from "./_components/tab-territorios";
import { TabParametros } from "./_components/tab-parametros";
import { TabDatosDemo } from "./_components/tab-datos-demo";
import { AuditoriaReciente } from "./_components/auditoria-reciente";

interface DatosAdministracion {
  usuarios: UsuarioConTerritorio[];
  territorios: TerritorioConConteos[];
  auditoria: RegistroAuditoria[];
  counts: Record<string, number>;
}

async function cargarDatos(): Promise<DatosAdministracion> {
  const [usuarios, territorios, auditoria, usuariosCount, territoriosCount, vehiculosCount, solicitudesCount, reservacionesCount, incidenciasCount, parametrosCount, auditoriaCount] =
    await Promise.all([
      listarUsuarios(),
      listarTerritoriosConConteos(),
      listarAuditoriaReciente(20),
      db.usuarios.count(),
      db.territorios.count(),
      db.vehiculos.count(),
      db.solicitudes.count(),
      db.reservaciones.count(),
      db.incidencias.count(),
      db.parametrosOperativos.count(),
      db.registrosAuditoria.count(),
    ]);

  return {
    usuarios,
    territorios,
    auditoria,
    counts: {
      usuarios: usuariosCount,
      territorios: territoriosCount,
      vehiculos: vehiculosCount,
      solicitudes: solicitudesCount,
      reservaciones: reservacionesCount,
      incidencias: incidenciasCount,
      parametrosOperativos: parametrosCount,
      registrosAuditoria: auditoriaCount,
    },
  };
}

export default function AdministracionPage() {
  const { rolActivo, usuarioActivo } = useSessionStore();
  const esAdminFlota = rolActivo === "ADMIN_FLOTA";
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [datos, setDatos] = useState<DatosAdministracion | null>(null);
  const [mensajeError, setMensajeError] = useState("");

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const data = await cargarDatos();
      setDatos(data);
      setEstado("listo");
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar la administración.");
      setEstado("error");
    }
  }, []);

  useEffect(() => {
    initializeDemoData().then(cargar);
  }, [cargar]);

  async function manejarReset() {
    await resetDemoData();
    await cargar();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Administración</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Punto único de verdad de la plataforma</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Usuarios de prueba, territorios y todos los parámetros de negocio (horario laboral, costos, emisiones, pesos de asignación, metas).
            Cada cambio se aplica de inmediato en toda la app y queda en la auditoría.
          </p>
        </section>

        {estado === "cargando" && <LoadingState message="Cargando administración..." />}
        {estado === "error" && <ErrorState description={mensajeError} />}

        {estado === "listo" && datos && usuarioActivo && (
          <Tabs defaultValue={esAdminFlota ? "usuarios" : "parametros"}>
            <TabsList>
              {esAdminFlota && <TabsTrigger value="usuarios">Usuarios</TabsTrigger>}
              {esAdminFlota && <TabsTrigger value="territorios">Territorios</TabsTrigger>}
              <TabsTrigger value="parametros">Parámetros</TabsTrigger>
              {esAdminFlota && <TabsTrigger value="datos-demo">Datos demo</TabsTrigger>}
            </TabsList>

            {esAdminFlota && (
              <TabsContent value="usuarios" className="mt-6">
                <TabUsuarios usuarios={datos.usuarios} usuarioActivoId={usuarioActivo.id} onCambio={cargar} />
              </TabsContent>
            )}

            {esAdminFlota && (
              <TabsContent value="territorios" className="mt-6">
                <TabTerritorios territorios={datos.territorios} usuarioId={usuarioActivo.id} onCambio={cargar} />
              </TabsContent>
            )}

            <TabsContent value="parametros" className="mt-6 space-y-6">
              <TabParametros soloLectura={!esAdminFlota} usuarioId={usuarioActivo.id} onGuardado={cargar} />
              <AuditoriaReciente registros={datos.auditoria} />
            </TabsContent>

            {esAdminFlota && (
              <TabsContent value="datos-demo" className="mt-6">
                <TabDatosDemo counts={datos.counts} onReset={manejarReset} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
