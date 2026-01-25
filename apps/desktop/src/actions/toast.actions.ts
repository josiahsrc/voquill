import { emitTo } from "@tauri-apps/api/event";
import { Toast, ToastAction, ToastType } from "../types/toast.types";

export type ShowToastOptions = {
  title: string;
  message: string;
  toastType?: ToastType;
  duration?: number;
  action?: ToastAction;
};

export async function showToast(options: ShowToastOptions): Promise<void> {
  const toast: Toast = {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: options.title,
    message: options.message,
    toastType: options.toastType ?? "info",
    duration: options.duration,
    action: options.action,
  };

  await emitTo("toast-overlay", "toast", { toast });
}
