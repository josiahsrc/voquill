import { emitTo } from "@tauri-apps/api/event";
import { Toast, ToastType } from "../types/toast.types";

export type ShowToastOptions = {
  title: string;
  message: string;
  toastType?: ToastType;
  duration?: number;
};

export async function showToast(options: ShowToastOptions): Promise<void> {
  const toast: Toast = {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: options.title,
    message: options.message,
    toastType: options.toastType ?? "info",
    duration: options.duration,
  };

  // Emit event to the toast window
  await emitTo("toast", "toast", { toast });
}

export async function showErrorToast(
  title: string,
  message: string,
  duration?: number,
): Promise<void> {
  await showToast({ title, message, toastType: "error", duration });
}

export async function showInfoToast(
  title: string,
  message: string,
  duration?: number,
): Promise<void> {
  await showToast({ title, message, toastType: "info", duration });
}
