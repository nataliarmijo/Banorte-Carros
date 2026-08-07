import { Toast } from "@base-ui/react/toast";

/**
 * Manejador global de notificaciones (toast) — se puede llamar desde
 * cualquier componente cliente sin pasar por contexto de React. Montado en
 * pantalla por <Toaster /> (components/toaster.tsx) en el layout raíz.
 */
export const toastManager = Toast.createToastManager();

function agregar(type: "success" | "error" | "info", title: string, description?: string) {
  return toastManager.add({ type, title, description, timeout: type === "error" ? 7000 : 4000 });
}

/** Confirmaciones de éxito tras una acción (crear, aprobar, guardar, etc.). */
export const toast = {
  success: (title: string, description?: string) => agregar("success", title, description),
  /** Mensaje de error en español, nunca el texto técnico crudo de una excepción. */
  error: (title: string, description?: string) => agregar("error", title, description),
  info: (title: string, description?: string) => agregar("info", title, description),
};
