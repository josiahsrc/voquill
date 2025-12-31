export type ToastType = "info" | "error";

export type ToastAction = "upgrade";

export type Toast = {
  id: string;
  title: string;
  message: string;
  toastType: ToastType;
  duration?: number;
  action?: ToastAction;
};
