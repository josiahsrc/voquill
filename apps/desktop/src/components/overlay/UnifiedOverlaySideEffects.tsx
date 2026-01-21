import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  cursorPosition,
  getCurrentWindow,
} from "@tauri-apps/api/window";
import { useEffect, useMemo, useRef } from "react";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { produceAppState, useAppStore } from "../../store";
import type {
  OverlayPhase,
  OverlaySyncPayload,
} from "../../types/overlay.types";
import type { Toast } from "../../types/toast.types";

type OverlayPhasePayload = {
  phase: OverlayPhase;
};

type RecordingLevelPayload = {
  levels?: number[];
};

type ToastPayload = {
  toast: Toast;
};

const DEFAULT_TOAST_DURATION_MS = 3000;

export const UnifiedOverlaySideEffects = () => {
  const currentToast = useAppStore((state) => state.currentToast);
  const toastQueue = useAppStore((state) => state.toastQueue);
  const timerRef = useRef<number | null>(null);
  const windowRef = useMemo(() => getCurrentWindow(), []);

  useEffect(() => {
    let animationFrame: number;
    let canceled = false;

    const poll = async () => {
      if (canceled) return;
      try {
        const pos = await cursorPosition();
        const windowPos = await windowRef.outerPosition();
        const scale = await windowRef.scaleFactor();
        produceAppState((draft) => {
          draft.overlayCursor = {
            x: Math.round((pos.x - windowPos.x) / scale),
            y: Math.round((pos.y - windowPos.y) / scale),
          };
        });
      } catch {
        // ignore
      }
      if (!canceled) {
        animationFrame = requestAnimationFrame(poll);
      }
    };

    poll();
    return () => {
      canceled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [windowRef]);

  useTauriListen<OverlayPhasePayload>("overlay_phase", (payload) => {
    produceAppState((draft) => {
      draft.overlayPhase = payload.phase;
      if (payload.phase !== "recording") {
        draft.audioLevels = [];
      }
    });
  });

  useTauriListen<RecordingLevelPayload>("recording_level", (payload) => {
    const raw = Array.isArray(payload.levels) ? payload.levels : [];
    const sanitized = raw.map((value) =>
      typeof value === "number" && Number.isFinite(value) ? value : 0,
    );

    produceAppState((draft) => {
      draft.audioLevels = sanitized;
    });
  });

  useTauriListen<OverlaySyncPayload>("overlay_sync", (payload) => {
    produceAppState((draft) => {
      Object.assign(draft, payload);
    });
  });

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

  return null;
};
