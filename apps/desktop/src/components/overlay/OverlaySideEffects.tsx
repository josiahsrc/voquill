import { useTauriListen } from "../../hooks/tauri.hooks";
import { produceAppState } from "../../store";
import { OverlayPhase } from "../../types/overlay.types";

export type OverlayPhasePayload = {
  phase: OverlayPhase;
};

export const OverlaySideEffects = () => {
  useTauriListen<OverlayPhasePayload>("overlay_phase", (payload) => {
    produceAppState((draft) => {
      draft.overlayPhase = payload.phase;
    });
  });

  return null;
};
