import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef, useCallback } from "react";
import { showErrorSnackbar } from "../actions/app.actions";

export const useTauriListen = <T = unknown>(
  eventName: string,
  callback: (event: T) => void | Promise<void>
) => {
  const cbRef = useRef(callback);
  cbRef.current = callback; // always latest

  // stable wrapper so effect deps stay shallow
  const stableHandler = useCallback(async (e: { payload: T }) => {
    try {
      await cbRef.current(e.payload);
    } catch (error) {
      showErrorSnackbar(error);
    }
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let canceled = false;

    (async () => {
      const u = await listen<T>(eventName, stableHandler);
      if (canceled) {
        // StrictMode double-invoke: cleanup may have already run
        u(); // immediately unlisten
      } else {
        unlisten = u;
      }
    })();

    return () => {
      canceled = true;
      if (unlisten) unlisten();
    };
  }, [eventName, stableHandler]);
};
