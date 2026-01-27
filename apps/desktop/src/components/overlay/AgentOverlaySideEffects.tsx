import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { produceAppState, useAppStore } from "../../store";
import type {
  OverlayPhase,
  OverlaySyncPayload,
} from "../../types/overlay.types";

type OverlayPhasePayload = {
  phase: OverlayPhase;
};

type RecordingLevelPayload = {
  levels?: number[];
};

export const AgentOverlaySideEffects = () => {
  const agentPhase = useAppStore((state) => state.agent.overlayPhase);

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
    emitTo("main", "overlay_ready", { windowLabel: "agent-overlay" }).catch(
      console.error,
    );
  }, []);

  useEffect(() => {
    const isVisible = agentPhase !== "idle";
    invoke("set_agent_overlay_click_through", {
      clickThrough: !isVisible,
    }).catch(console.error);
  }, [agentPhase]);

  return null;
};
