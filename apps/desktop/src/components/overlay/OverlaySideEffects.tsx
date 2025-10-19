import { useTauriListen } from "../../hooks/tauri.hooks";
import { produceAppState } from "../../store";
import { OverlayPhase } from "../../types/overlay.types";

type OverlayPhasePayload = {
  phase: OverlayPhase;
};

type RecordingLevelPayload = {
  levels?: number[];
};

export const OverlaySideEffects = () => {
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

  return null;
};
