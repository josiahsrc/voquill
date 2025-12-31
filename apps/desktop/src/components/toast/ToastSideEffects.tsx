import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { produceAppState, useAppStore } from "../../store";
import { Toast } from "../../types/toast.types";

type ToastPayload = {
  toast: Toast;
};

const TOAST_DURATION_MS = 3000;

export const ToastSideEffects = () => {
  const currentToast = useAppStore((state) => state.currentToast);
  const toastQueue = useAppStore((state) => state.toastQueue);
  const timerRef = useRef<number | null>(null);

  // Listen for toast events from Tauri
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let canceled = false;

    listen<ToastPayload>("toast", (event) => {
      produceAppState((draft) => {
        draft.toastQueue.push(event.payload.toast);
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

  // When queue has items and no current toast, show next toast
  useEffect(() => {
    if (currentToast === null && toastQueue.length > 0) {
      produceAppState((draft) => {
        const nextToast = draft.toastQueue.shift();
        if (nextToast) {
          draft.currentToast = nextToast;
        }
      });
    }
  }, [currentToast, toastQueue.length]);

  // Auto-dismiss current toast after duration
  useEffect(() => {
    if (currentToast !== null) {
      timerRef.current = window.setTimeout(() => {
        produceAppState((draft) => {
          draft.currentToast = null;
        });
      }, TOAST_DURATION_MS);

      return () => {
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [currentToast?.id]);

  return null;
};
