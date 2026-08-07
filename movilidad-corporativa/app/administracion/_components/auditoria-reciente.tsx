"use client";

import type { RegistroAuditoria } from "@/lib/models";

function resumenCambio(registro: RegistroAuditoria): string {
  try {
    const detalle = JSON.parse(registro.cambiosJson);
    if (detalle && typeof detalle === "object" && "campo" in detalle) {
      return `${detalle.campo}: ${JSON.stringify(detalle.valorAnterior)} → ${JSON.stringify(detalle.valorNuevo)}`;
    }
    return registro.cambiosJson;
  } catch {
    return registro.cambiosJson;
  }
}

export function AuditoriaReciente({ registros }: { registros: RegistroAuditoria[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Auditoría reciente</h3>
      <p className="mt-1 text-sm text-slate-600">Quién cambió qué, de qué valor a qué valor y cuándo, en toda la app.</p>

      {registros.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Todavía no hay cambios registrados.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2 pr-3">Cuándo</th>
                <th className="py-2 pr-3">Entidad</th>
                <th className="py-2 pr-3">Acción</th>
                <th className="py-2 pr-3">Cambio</th>
                <th className="py-2 pr-3">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap py-2 pr-3 text-xs text-slate-500">{new Date(r.fechaCambio).toLocaleString("es-MX")}</td>
                  <td className="py-2 pr-3 text-slate-700">
                    {r.entidad} · {r.entidadId}
                  </td>
                  <td className="py-2 pr-3 text-slate-700">{r.accion}</td>
                  <td className="py-2 pr-3 text-slate-600">{resumenCambio(r)}</td>
                  <td className="py-2 pr-3 text-slate-600">{r.usuarioId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
