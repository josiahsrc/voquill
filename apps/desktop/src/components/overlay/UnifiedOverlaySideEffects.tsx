import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
  PhysicalPosition,
  PhysicalSize,
} from "@tauri-apps/api/window";
import { useEffect, useMemo, useRef } from "react";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { produceAppState, useAppStore } from "../../store";
import type {
  OverlayPhase,
  OverlaySyncPayload,
} from "../../types/overlay.types";
import type { Toast } from "../../types/toast.types";
import { getPlatform } from "../../utils/platform.utils";

type OverlayPhasePayload = {
  phase: OverlayPhase;
};

type RecordingLevelPayload = {
  levels?: number[];
};

type ToastPayload = {
  toast: Toast;
};

interface MonitorAtCursor {
  x: number;
  y: number;
  width: number;
  height: number;
  visibleX: number;
  visibleY: number;
  visibleWidth: number;
  visibleHeight: number;
  scaleFactor: number;
  cursorX: number;
  cursorY: number;
}

const DEFAULT_TOAST_DURATION_MS = 3000;
const CURSOR_POLL_MS = 100;
const SWITCH_DEBOUNCE_MS = 200;

function getMonitorId(monitor: MonitorAtCursor): string {
  return `${monitor.x},${monitor.y}`;
}

async function repositionOverlay(
  windowRef: ReturnType<typeof getCurrentWindow>,
  monitor: MonitorAtCursor,
): Promise<void> {
  const platform = getPlatform();

  if (platform === "windows") {
    await windowRef.setSize(
      new PhysicalSize(
        monitor.width * monitor.scaleFactor,
        monitor.height * monitor.scaleFactor,
      ),
    );
    await windowRef.setPosition(
      new PhysicalPosition(
        monitor.x * monitor.scaleFactor,
        monitor.y * monitor.scaleFactor,
      ),
    );
  } else {
    await windowRef.setSize(
      new LogicalSize(monitor.visibleWidth, monitor.visibleHeight),
    );
    await windowRef.setPosition(
      new LogicalPosition(monitor.visibleX, monitor.visibleY),
    );
  }
}

export const UnifiedOverlaySideEffects = () => {
  const currentToast = useAppStore((state) => state.currentToast);
  const toastQueue = useAppStore((state) => state.toastQueue);
  const timerRef = useRef<number | null>(null);
  const windowRef = useMemo(() => getCurrentWindow(), []);

  const currentMonitorIdRef = useRef<string | null>(null);
  const lastSwitchTimeRef = useRef(0);
  const isRepositioningRef = useRef(false);

  useIntervalAsync(CURSOR_POLL_MS, async () => {
    if (isRepositioningRef.current) return;

    const targetMonitor = await invoke<MonitorAtCursor | null>(
      "get_monitor_at_cursor",
    ).catch(() => null);

    if (targetMonitor) {
      produceAppState((draft) => {
        draft.overlayCursor = {
          x: Math.round(targetMonitor.cursorX - targetMonitor.visibleX),
          y: Math.round(
            targetMonitor.visibleHeight -
              (targetMonitor.cursorY - targetMonitor.visibleY),
          ),
        };
      });
    }

    if (!targetMonitor) return;

    const targetId = getMonitorId(targetMonitor);

    if (currentMonitorIdRef.current === null) {
      currentMonitorIdRef.current = targetId;
      return;
    }

    if (targetId === currentMonitorIdRef.current) return;

    const now = Date.now();
    if (now - lastSwitchTimeRef.current < SWITCH_DEBOUNCE_MS) return;

    isRepositioningRef.current = true;
    lastSwitchTimeRef.current = now;

    try {
      await repositionOverlay(windowRef, targetMonitor);
      currentMonitorIdRef.current = targetId;
    } finally {
      isRepositioningRef.current = false;
    }
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
