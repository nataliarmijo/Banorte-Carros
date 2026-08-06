import { AppShell } from "@/components/app-shell";

interface PlaceholderPageProps {
  title: string;
  description: string;
  highlights: string[];
}

export function PlaceholderPage({ title, description, highlights }: PlaceholderPageProps) {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Vista de preparación</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {highlights.map((item) => (
            <div key={item} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-700">{item}</p>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
