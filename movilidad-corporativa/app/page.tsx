import { AppShell } from "@/components/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Resumen operativo</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Flotilla corporativa preparada para el siguiente chunk</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              El proyecto ya tiene la base visual, el modelo de datos, los motores de negocio desacoplados de la interfaz, y ahora el shell de navegación con selección de rol.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Vehículos Pool</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">14%</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Solicitudes diarias</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">~2</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Ahorro estimado</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">MXN 0</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Estado del MVP</p>
            <h3 className="mt-2 text-xl font-semibold">Base lista</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              La arquitectura está separada en UI, servicios de negocio, repositorios y configuración editable para migrar a Firebase o Firestore después.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Asignación inteligente", value: "Motor configurado", tone: "bg-emerald-50 text-emerald-700" },
            { title: "Costos", value: "Tarifas centralizadas", tone: "bg-sky-50 text-sky-700" },
            { title: "Ahorros", value: "Comparador listo", tone: "bg-amber-50 text-amber-700" },
            { title: "Emisiones", value: "Métricas preparadas", tone: "bg-rose-50 text-rose-700" },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.tone}`}>{item.value}</p>
              <h4 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h4>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
