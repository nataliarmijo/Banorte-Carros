"use client";

import { AlertCircle, Inbox, Loader2 } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-12">
      <div className="text-slate-400">{icon || <Inbox className="h-12 w-12" />}</div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-slate-600">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Cargando..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function ErrorState({
  title = "Error",
  description = "Ocurrió un problema al cargar los datos.",
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
      <AlertCircle className="h-12 w-12 text-red-400" />
      <h3 className="mt-4 text-lg font-semibold text-red-900">{title}</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-red-700">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
