import { emitTo } from "@tauri-apps/api/event";
import { Toast, ToastType } from "../types/toast.types";

export async function showToast(
  title: string,
  message: string,
  toastType: ToastType = "info",
): Promise<void> {
  const toast: Toast = {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    message,
    toastType,
  };

  // Emit event to the toast window
  await emitTo("toast", "toast", { toast });
}

export async function showErrorToast(
  title: string,
  message: string,
): Promise<void> {
  await showToast(title, message, "error");
}

export async function showInfoToast(
  title: string,
  message: string,
): Promise<void> {
  await showToast(title, message, "info");
}
