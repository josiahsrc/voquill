import { useTauriListen } from "../../hooks/tauri.hooks";
import { produceAppState } from "../../store";
import type { AgentWindowState } from "../../types/agent-window.types";
import type { OverlayPhase } from "../../types/overlay.types";

type OverlayPhasePayload = {
  phase: OverlayPhase;
};

type RecordingLevelPayload = {
  levels?: number[];
};

type WindowStatePayload = {
  state: AgentWindowState | null;
};

export const AgentOverlaySideEffects = () => {
  useTauriListen<WindowStatePayload>("agent_window_state", (payload) => {
    produceAppState((draft) => {
      draft.agent.windowState = payload.state;
    });
  });

  useTauriListen<OverlayPhasePayload>("agent_overlay_phase", (payload) => {
    produceAppState((draft) => {
      draft.agent.overlayPhase = payload.phase;
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
