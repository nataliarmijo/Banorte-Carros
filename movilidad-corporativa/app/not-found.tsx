import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Movilidad Corporativa</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Página en construcción</h1>
        <p className="mt-2 text-sm text-slate-600">Esta ruta se preparará para los próximos chunks del proyecto.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Regresar al inicio
        </Link>
      </div>
    </div>
  );
}
