import { emitTo } from "@tauri-apps/api/event";
import { isEqual } from "lodash-es";
import { useEffect, useRef } from "react";
import type { AppState } from "../../state/app.state";
import { useAppStore } from "../../store";
import type { OverlaySyncPayload } from "../../types/overlay.types";

const useOverlaySync = <T>(
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
    emitTo(
      "unified-overlay",
      "overlay_sync",
      toPayloadRef.current(value),
    ).catch(console.error);
  }, [value]);
};

export const OverlaySyncSideEffects = () => {
  useOverlaySync(
    (s) => s.hotkeyById,
    (hotkeyById) => ({ hotkeyById }),
  );
  useOverlaySync(
    (s) => s.agent,
    (agent) => ({ agent }),
  );
  useOverlaySync(
    (s) => s.userPrefs,
    (userPrefs) => ({ userPrefs }),
  );
  useOverlaySync(
    (s) => s.userById,
    (userById) => ({ userById }),
  );
  useOverlaySync(
    (s) => s.auth,
    (auth) => ({ auth }),
  );
  useOverlaySync(
    (s) => s.memberById,
    (memberById) => ({ memberById }),
  );
  useOverlaySync(
    (s) => s.onboarding,
    (onboarding) => ({ onboarding }),
  );

  return null;
};
