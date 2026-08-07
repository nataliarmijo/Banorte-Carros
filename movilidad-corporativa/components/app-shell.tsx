"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutGrid, PlusCircle, CalendarDays, ShieldCheck, Bus, MapPinned, AlertTriangle, ChartColumn, Settings, MoonStar, ChevronLeft } from "lucide-react";
import { useSessionStore, type RolActivo } from "@/lib/stores/session";
import { RoleSelector } from "@/components/role-selector";
import { AlertaIncidenciasCriticas } from "@/components/alerta-incidencias-criticas";
import { BandejaNotificaciones } from "@/components/bandeja-notificaciones";

type NavigationItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: RolActivo[];
};

const navigationItems: NavigationItem[] = [
  { label: "Inicio", href: "/", icon: LayoutGrid, roles: ["COLABORADOR", "APROBADOR", "ADMIN_FLOTA", "EJECUTIVO"] },
  { label: "Nueva solicitud", href: "/solicitudes/nueva", icon: PlusCircle, roles: ["COLABORADOR"] },
  { label: "Mis reservaciones", href: "/reservaciones", icon: CalendarDays, roles: ["COLABORADOR", "APROBADOR"] },
  { label: "Aprobaciones", href: "/aprobaciones", icon: ShieldCheck, roles: ["APROBADOR"] },
  { label: "Operación de flota", href: "/operacion", icon: Bus, roles: ["ADMIN_FLOTA"] },
  { label: "Vehículos", href: "/vehiculos", icon: Bus, roles: ["ADMIN_FLOTA"] },
  { label: "Mapa", href: "/mapa", icon: MapPinned, roles: ["COLABORADOR", "APROBADOR", "ADMIN_FLOTA", "EJECUTIVO"] },
  { label: "Incidencias", href: "/incidencias", icon: AlertTriangle, roles: ["ADMIN_FLOTA"] },
  { label: "Analítica", href: "/analitica", icon: ChartColumn, roles: ["EJECUTIVO", "ADMIN_FLOTA"] },
  { label: "Administración", href: "/administracion", icon: Settings, roles: ["ADMIN_FLOTA", "EJECUTIVO"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { rolActivo, usuarioActivo } = useSessionStore();

  const visibleItems = navigationItems.filter((item) => item.roles.includes(rolActivo));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.04),_transparent_35%),linear-gradient(135deg,_#f8fafc_0%,_#f1f5f9_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        {/* Sidebar - Desktop */}
        <aside
          className={`hidden border-b border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur transition-all duration-300 lg:block lg:border-b-0 lg:border-r lg:min-h-screen ${
            sidebarOpen ? "lg:w-72" : "lg:w-20"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={sidebarOpen ? "block" : "hidden"}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Banorte</p>
              <h2 className="text-lg font-semibold text-slate-900">Movilidad</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 lg:flex"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5 rotate-180" />}
            </button>
          </div>

          <nav className={`mt-6 space-y-1 ${sidebarOpen ? "block" : "space-y-3"}`}>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-100 text-blue-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  title={sidebarOpen ? "" : item.label}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {sidebarOpen && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Modo claro</p>
                <MoonStar className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-xs text-slate-600">Tema corporativo listo para escalar a modo oscuro.</p>
            </div>
          )}
        </aside>

        {/* Mobile Menu Button */}
        <div className="block lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="absolute left-4 top-4 z-40 rounded-full border border-slate-200 p-2 text-slate-600 lg:hidden"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed left-0 top-0 z-40 h-full w-64 border-r border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur transition-transform duration-300 lg:hidden ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Banorte</p>
            <h2 className="text-lg font-semibold text-slate-900">Movilidad Corporativa</h2>
          </div>

          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-100 text-blue-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white/70 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Panel operativo</p>
                <h1 className="text-xl font-semibold text-slate-900">Bienvenido a Movilidad Corporativa</h1>
              </div>
              <div className="flex items-center gap-2">
                <AlertaIncidenciasCriticas />
                <BandejaNotificaciones />
                <RoleSelector />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
