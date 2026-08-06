import Link from "next/link";
import { Menu, LayoutGrid, PlusCircle, CalendarDays, ShieldCheck, Bus, MapPinned, AlertTriangle, ChartColumn, Settings, MoonStar } from "lucide-react";

const navigation = [
  { label: "Inicio", href: "/", icon: LayoutGrid },
  { label: "Nueva solicitud", href: "/solicitudes/nueva", icon: PlusCircle },
  { label: "Mis reservaciones", href: "/reservaciones", icon: CalendarDays },
  { label: "Aprobaciones", href: "/aprobaciones", icon: ShieldCheck },
  { label: "Operación de flota", href: "/operacion", icon: Bus },
  { label: "Vehículos", href: "/vehiculos", icon: Bus },
  { label: "Mapa", href: "/mapa", icon: MapPinned },
  { label: "Incidencias", href: "/incidencias", icon: AlertTriangle },
  { label: "Analítica", href: "/analitica", icon: ChartColumn },
  { label: "Administración", href: "/administracion", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.04),_transparent_35%),linear-gradient(135deg,_#f8fafc_0%,_#f1f5f9_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Banorte</p>
              <h2 className="text-lg font-semibold text-slate-900">Movilidad Corporativa</h2>
            </div>
            <button className="rounded-full border border-slate-200 p-2 text-slate-600 lg:hidden" aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-6 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Modo claro</p>
              <MoonStar className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-2 text-sm text-slate-600">Tema corporativo listo para escalar a modo oscuro.</p>
          </div>
        </aside>

        <div className="flex-1">
          <header className="border-b border-slate-200 bg-white/70 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Panel operativo</p>
                <h1 className="text-xl font-semibold text-slate-900">Bienvenido a Movilidad Corporativa</h1>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                MXN · Reservas y asignación
              </div>
            </div>
          </header>
          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
