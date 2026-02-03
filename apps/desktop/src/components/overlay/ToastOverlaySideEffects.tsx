import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { produceAppState, useAppStore } from "../../store";
import type { OverlaySyncPayload } from "../../types/overlay.types";
import type { Toast } from "../../types/toast.types";

type ToastPayload = {
  toast: Toast;
};

const DEFAULT_TOAST_DURATION_MS = 3000;

export const ToastOverlaySideEffects = () => {
  const currentToast = useAppStore((state) => state.currentToast);
  const timerRef = useRef<number | null>(null);

  useTauriListen<OverlaySyncPayload>("overlay_sync", (payload) => {
    produceAppState((draft) => {
      Object.assign(draft, payload);
    });
  });

  useEffect(() => {
    emitTo("main", "overlay_ready", { windowLabel: "toast-overlay" }).catch(
      console.error,
    );
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let canceled = false;

    listen<ToastPayload>("toast", (event) => {
      produceAppState((draft) => {
        draft.currentToast = event.payload.toast;
        draft.toastQueue = [];
      });
    }).then((fn) => {
      if (canceled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      canceled = true;
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    if (currentToast !== null) {
      const duration = currentToast.duration ?? DEFAULT_TOAST_DURATION_MS;
      timerRef.current = window.setTimeout(() => {
        produceAppState((draft) => {
          draft.currentToast = null;
        });
      }, duration);

      return () => {
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [currentToast?.id, currentToast?.duration]);

  useEffect(() => {
    invoke("set_toast_overlay_click_through", {
      clickThrough: !currentToast,
    }).catch(console.error);
  }, [currentToast]);

  return null;
};
