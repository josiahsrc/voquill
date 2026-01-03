import type { AgentWindowState } from "../types/agent-window.types";
import type { OverlayPhase } from "../types/overlay.types";

export type AgentState = {
  overlayPhase: OverlayPhase;
  windowState: AgentWindowState | null;
};

export const INITIAL_AGENT_STATE: AgentState = {
  overlayPhase: "idle",
  windowState: null,
};
