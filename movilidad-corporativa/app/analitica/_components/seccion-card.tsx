export function SeccionCard({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{titulo}</h3>
        {descripcion && <p className="mt-1 text-sm text-slate-600">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

export function TablaSimple({ columnas, filas }: { columnas: string[]; filas: Array<Array<React.ReactNode>> }) {
  if (filas.length === 0) {
    return <p className="text-sm text-slate-500">Sin datos suficientes.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
            {columnas.map((c) => (
              <th key={c} className="whitespace-nowrap py-2 pr-4">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {fila.map((celda, j) => (
                <td key={j} className="whitespace-nowrap py-2 pr-4 text-slate-700">
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
