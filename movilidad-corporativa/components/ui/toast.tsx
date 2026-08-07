"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { CheckCircle2Icon, InfoIcon, TriangleAlertIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitive.Provider

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed top-auto right-4 bottom-4 z-100 mx-auto flex w-full max-w-sm flex-col outline-none sm:right-6 sm:bottom-6",
        className
      )}
      {...props}
    />
  )
}

const ICONO_POR_TIPO: Record<string, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2Icon,
  error: TriangleAlertIcon,
  info: InfoIcon,
}

const ESTILO_POR_TIPO: Record<string, string> = {
  success: "ring-emerald-200 [&_[data-slot=toast-icon]]:text-emerald-600",
  error: "ring-red-200 [&_[data-slot=toast-icon]]:text-red-600",
  info: "ring-blue-200 [&_[data-slot=toast-icon]]:text-blue-600",
};

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toast) => {
    const Icono = toast.type ? ICONO_POR_TIPO[toast.type] : undefined
    return (
      <ToastPrimitive.Root
        key={toast.id}
        toast={toast}
        data-slot="toast"
        className={cn(
          "absolute right-0 bottom-0 left-auto z-[calc(100-var(--toast-index))] mr-0 w-full rounded-xl bg-popover p-3.5 text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition-all duration-300",
          "data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          "data-[expanded]:[transform:translateY(calc(var(--toast-offset-y)*-1))]",
          "data-[limited]:opacity-0",
          toast.type ? ESTILO_POR_TIPO[toast.type] : undefined
        )}
      >
        <div className="flex items-start gap-2.5">
          {Icono && <Icono className="mt-0.5 h-4.5 w-4.5 shrink-0" data-slot="toast-icon" />}
          <div className="min-w-0 flex-1">
            <ToastPrimitive.Title data-slot="toast-title" className="text-sm font-medium text-foreground" />
            {toast.description && (
              <ToastPrimitive.Description data-slot="toast-description" className="mt-0.5 text-sm text-muted-foreground" />
            )}
          </div>
          <ToastPrimitive.Close
            data-slot="toast-close"
            aria-label="Cerrar notificación"
            className="-m-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <XIcon className="h-4 w-4" />
          </ToastPrimitive.Close>
        </div>
      </ToastPrimitive.Root>
    )
  })
}

export { ToastProvider, ToastViewport, ToastList }
