import { emitTo } from "@tauri-apps/api/event";
import { isEqual } from "lodash-es";
import { useEffect, useRef } from "react";
import { useTauriListen } from "../../hooks/tauri.hooks";
import type { AppState } from "../../state/app.state";
import { getAppState, useAppStore } from "../../store";
import type { OverlaySyncPayload } from "../../types/overlay.types";

type OverlayReadyPayload = {
  windowLabel: string;
};

const OVERLAY_TARGETS = ["pill-overlay", "toast-overlay", "agent-overlay"];

const buildFullSyncPayload = (state: AppState): OverlaySyncPayload => ({
  hotkeyById: state.hotkeyById,
  agent: state.agent,
  userPrefs: state.userPrefs,
  userById: state.userById,
  auth: state.auth,
  memberById: state.memberById,
  onboarding: state.onboarding,
});

const useOverlaySync = <T>(
  targets: string[],
  selector: (state: AppState) => T,
  toPayload: (value: T) => OverlaySyncPayload,
) => {
  const value = useAppStore(selector);
  const prevRef = useRef<T | null>(null);
  const toPayloadRef = useRef(toPayload);
  toPayloadRef.current = toPayload;

  useEffect(() => {
    if (prevRef.current !== null && isEqual(prevRef.current, value)) {
      return;
    }

    prevRef.current = value;
    for (const target of targets) {
      emitTo(target, "overlay_sync", toPayloadRef.current(value)).catch(
        console.error,
      );
    }
  }, [value]);
};

export const OverlaySyncSideEffects = () => {
  useTauriListen<OverlayReadyPayload>("overlay_ready", (payload) => {
    const { windowLabel } = payload;
    if (!OVERLAY_TARGETS.includes(windowLabel)) {
      return;
    }

    const state = getAppState();
    const fullPayload = buildFullSyncPayload(state);
    emitTo(windowLabel, "overlay_sync", fullPayload).catch(console.error);
  });

  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.hotkeyById,
    (hotkeyById) => ({ hotkeyById }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.agent,
    (agent) => ({ agent }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.userPrefs,
    (userPrefs) => ({ userPrefs }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.userById,
    (userById) => ({ userById }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.auth,
    (auth) => ({ auth }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.memberById,
    (memberById) => ({ memberById }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.onboarding,
    (onboarding) => ({ onboarding }),
  );

  return null;
};
