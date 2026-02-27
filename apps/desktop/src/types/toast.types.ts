export type ToastType = "info" | "error";

export type ToastAction = "upgrade" | "open_agent_settings" | "surface_window";

export type Toast = {
  id: string;
  title: string;
  message: string;
  toastType: ToastType;
  duration?: number;
  action?: ToastAction;
};
