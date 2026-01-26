import { emitTo } from "@tauri-apps/api/event";
import { isEqual } from "lodash-es";
import { useEffect, useRef } from "react";
import type { AppState } from "../../state/app.state";
import { useAppStore } from "../../store";
import type { OverlaySyncPayload } from "../../types/overlay.types";

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
  useOverlaySync(
    ["pill-overlay", "toast-overlay", "agent-overlay"],
    (s) => s.hotkeyById,
    (hotkeyById) => ({ hotkeyById }),
  );
  useOverlaySync(
    ["pill-overlay", "toast-overlay", "agent-overlay"],
    (s) => s.agent,
    (agent) => ({ agent }),
  );
  useOverlaySync(
    ["pill-overlay", "toast-overlay", "agent-overlay"],
    (s) => s.userPrefs,
    (userPrefs) => ({ userPrefs }),
  );
  useOverlaySync(
    ["pill-overlay", "toast-overlay", "agent-overlay"],
    (s) => s.userById,
    (userById) => ({ userById }),
  );
  useOverlaySync(
    ["pill-overlay", "toast-overlay", "agent-overlay"],
    (s) => s.auth,
    (auth) => ({ auth }),
  );
  useOverlaySync(
    ["pill-overlay", "toast-overlay", "agent-overlay"],
    (s) => s.memberById,
    (memberById) => ({ memberById }),
  );
  useOverlaySync(
    ["pill-overlay", "toast-overlay", "agent-overlay"],
    (s) => s.onboarding,
    (onboarding) => ({ onboarding }),
  );

  return null;
};
