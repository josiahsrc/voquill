export type ToastType = "info" | "error";

export type Toast = {
  id: string;
  title: string;
  message: string;
  toastType: ToastType;
  duration?: number;
};
