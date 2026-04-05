import { invoke } from "@tauri-apps/api/core";
import { getIntl } from "../i18n/intl";
import { ToastAction, ToastType } from "../types/toast.types";

function getActionLabel(action: ToastAction): string {
  const intl = getIntl();
  switch (action) {
    case "upgrade":
      return intl.formatMessage({ defaultMessage: "Upgrade" });
    case "open_agent_settings":
      return intl.formatMessage({ defaultMessage: "Fix" });
    case "surface_window":
      return intl.formatMessage({ defaultMessage: "Open" });
    case "confirm_cancel_transcription":
      return intl.formatMessage({ defaultMessage: "Yes, cancel" });
  }
}

export type ShowToastOptions = {
  message: string;
  toastType?: ToastType;
  duration?: number;
  action?: ToastAction;
};

export async function showToast(options: ShowToastOptions): Promise<void> {
  const durationSec = options.duration ? options.duration / 1000 : undefined;
  await invoke("sync_native_pill_assistant", {
    payload: JSON.stringify({
      type: "toast",
      message: options.message,
      toast_type: options.toastType ?? "info",
      duration: durationSec,
      action: options.action ?? null,
      action_label: options.action ? getActionLabel(options.action) : null,
    }),
  });
}

export async function dismissToast(): Promise<void> {
  await invoke("sync_native_pill_assistant", {
    payload: JSON.stringify({ type: "dismiss_toast" }),
  });
}
