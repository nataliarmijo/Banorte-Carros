"use client";

import { ToastProvider, ToastViewport, ToastList } from "@/components/ui/toast";
import { toastManager } from "@/lib/toast";

/** Monta el visor de notificaciones globales; una sola vez, en el layout raíz. */
export function Toaster() {
  return (
    <ToastProvider toastManager={toastManager}>
      <ToastViewport>
        <ToastList />
      </ToastViewport>
    </ToastProvider>
  );
}
