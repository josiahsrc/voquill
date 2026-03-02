import { ToastActionPayload } from "../types/toast.types";
import { useTauriListen } from "./tauri.hooks";

export const useToastAction = (
  callback: (payload: ToastActionPayload) => void | Promise<void>,
) => {
  useTauriListen<ToastActionPayload>("toast-action", callback);
};
