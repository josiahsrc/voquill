import { emitTo } from "@tauri-apps/api/event";
import { isEqual } from "lodash-es";
import { useEffect, useRef } from "react";
import { useAppStore } from "../../store";
import type { OverlaySyncPayload } from "../../types/overlay.types";

export const OverlaySyncSideEffects = () => {
  const overlaySyncPayload = useAppStore(
    (state): OverlaySyncPayload => ({
      hotkeyById: state.hotkeyById,
      agent: state.agent,
      userPrefs: state.userPrefs,
    }),
  );

  const prevSyncPayloadRef = useRef<OverlaySyncPayload | null>(null);

  useEffect(() => {
    if (
      prevSyncPayloadRef.current !== null &&
      isEqual(prevSyncPayloadRef.current, overlaySyncPayload)
    ) {
      return;
    }
    prevSyncPayloadRef.current = overlaySyncPayload;
    emitTo("unified-overlay", "overlay_sync", overlaySyncPayload).catch(
      console.error,
    );
  }, [overlaySyncPayload]);

  return null;
};
