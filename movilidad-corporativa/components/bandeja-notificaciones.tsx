"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { initializeDemoData } from "@/lib/seed/init";
import { useSessionStore } from "@/lib/stores/session";
import { contarNoLeidas, listarBandeja, marcarComoLeida, marcarTodasComoLeidas } from "@/lib/adapters/notificaciones";
import type { Notificacion } from "@/lib/models";
import type { TipoNotificacionEvento } from "@/lib/integraciones/notificaciones";
import { BadgeIntegracionSimulada } from "@/components/badge-integracion-simulada";

const ETIQUETA_TIPO: Record<TipoNotificacionEvento, string> = {
  SOLICITUD_CREADA: "Nueva solicitud",
  SOLICITUD_APROBADA: "Solicitud aprobada",
  SOLICITUD_RECHAZADA: "Solicitud rechazada",
  SOLICITUD_CAMBIOS: "Cambios solicitados",
  VEHICULO_ASIGNADO: "Vehículo asignado",
  RECORDATORIO_CHECKIN: "Recordatorio de check-in",
  RECORDATORIO_CHECKOUT: "Recordatorio de check-out",
  INCIDENCIA_CRITICA: "Incidencia crítica",
};

function formatearHaceTiempo(fechaISO: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(fechaISO).getTime()) / 60000));
  if (minutos < 1) return "hace instantes";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.round(horas / 24)} d`;
}

/** Bandeja interna de notificaciones (mock de correo/push): historial visible de lo que "se hubiera enviado" en eventos clave. */
export function BandejaNotificaciones() {
  const { usuarioActivo } = useSessionStore();
  const pathname = usePathname();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [abierto, setAbierto] = useState(false);

  async function cargar() {
    if (!usuarioActivo) return;
    const [lista, conteo] = await Promise.all([listarBandeja(usuarioActivo.id), contarNoLeidas(usuarioActivo.id)]);
    setNotificaciones(lista);
    setNoLeidas(conteo);
  }

  useEffect(() => {
    if (!usuarioActivo) return;
    let cancelado = false;
    initializeDemoData().then(async () => {
      if (cancelado) return;
      await cargar();
    });
    return () => {
      cancelado = true;
    };
    // Se refresca al navegar entre pantallas y al cambiar de usuario activo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioActivo?.id, pathname]);

  if (!usuarioActivo) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100"
        aria-label={`${noLeidas} notificación(es) sin leer`}
      >
        <Bell className="h-4 w-4" />
        {noLeidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
            {noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notificaciones <BadgeIntegracionSimulada titulo="No se envían correos/push/SMS reales; sólo quedan aquí." />
              </p>
              {noLeidas > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await marcarTodasComoLeidas(usuarioActivo.id);
                    await cargar();
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
                </button>
              )}
            </div>

            {notificaciones.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">Sin notificaciones todavía.</p>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {notificaciones.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!n.leida) {
                          await marcarComoLeida(n.id);
                          await cargar();
                        }
                      }}
                      className={`block w-full rounded-lg p-2 text-left text-sm transition ${n.leida ? "bg-white hover:bg-slate-50" : "bg-blue-50 hover:bg-blue-100"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-900">{ETIQUETA_TIPO[n.tipoNotificacion as TipoNotificacionEvento] ?? n.tipoNotificacion}</p>
                        {!n.leida && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">{n.mensaje}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatearHaceTiempo(n.fechaCreacion)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
