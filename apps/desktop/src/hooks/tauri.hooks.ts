import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { showErrorSnackbar } from "../actions/app.actions";

export const useTauriListen = <T = unknown>(
  eventName: string,
  callback: (event: T) => void | Promise<void>
) => {
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setupListener = async () => {
      unlisten = await listen<T>(eventName, async (event) => {
        try {
          await callback(event.payload);
        } catch (error) {
          showErrorSnackbar(error);
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [eventName, callback]);
}
