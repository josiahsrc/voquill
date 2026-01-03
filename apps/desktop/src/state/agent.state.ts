import { OverlayPhase } from "../types/overlay.types";

export type AgentState = {
  overlayPhase: OverlayPhase;
  overlayTranscript: string | null;
};

export const INITIAL_AGENT_STATE: AgentState = {
  overlayPhase: "idle",
  overlayTranscript: null,
};
