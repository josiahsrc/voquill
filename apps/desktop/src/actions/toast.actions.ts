import { invoke } from "@tauri-apps/api/core";
import { ToastType } from "../types/toast.types";

export async function showToast(
  title: string,
  message: string,
  toastType: ToastType = "info",
): Promise<void> {
  await invoke("show_toast", { title, message, toastType });
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
