import { emitTo } from "@tauri-apps/api/event";
import { processWithAgent } from "../actions/transcribe.actions";
import type {
  AgentWindowMessage,
  AgentWindowState,
} from "../types/agent-window.types";
import type { OverlayPhase } from "../types/overlay.types";
import { BaseRecordingStrategy } from "./base-recording.strategy";
import type {
  HandleTranscriptParams,
  HandleTranscriptResult,
} from "./recording.types";

export class AgentRecordingStrategy extends BaseRecordingStrategy {
  private messages: AgentWindowMessage[] = [];
  private isFirstTurn = true;

  private async emitState(state: AgentWindowState | null): Promise<void> {
    await emitTo("agent-overlay", "agent_window_state", { state });
  }

  async onBeforeStart(): Promise<void> {
    if (this.isFirstTurn) {
      // First turn: clear any previous state
      await this.emitState(null);
      this.isFirstTurn = false;
    }
    // Subsequent turns: window is already open, nothing to do
  }

  async setPhase(phase: OverlayPhase): Promise<void> {
    await emitTo("agent-overlay", "agent_overlay_phase", { phase });
  }

  async handleTranscript({
    rawTranscript,
    toneId,
    loadingToken,
  }: HandleTranscriptParams): Promise<HandleTranscriptResult> {
    // 1. Check for exit command
    const shouldExit = rawTranscript.toLowerCase().includes("stop");

    if (shouldExit) {
      if (
        loadingToken &&
        this.context.overlayLoadingTokenRef.current === loadingToken
      ) {
        this.context.overlayLoadingTokenRef.current = null;
      }
      await emitTo("agent-overlay", "agent_overlay_phase", { phase: "idle" });
      await this.emitState(null);
      return { shouldContinue: false };
    }

    // 2. Add user's message ("me") and emit immediately
    this.messages.push({ text: rawTranscript, sender: "me" });
    await this.emitState({ messages: this.messages });

    // 3. Call agent to get response
    const { transcript: agentResponse } = await processWithAgent({
      rawTranscript,
      toneId,
    });
    console.log("Agent response:", agentResponse);

    // 4. Add agent's response and emit
    if (agentResponse) {
      this.messages.push({ text: agentResponse, sender: "agent" });
      await this.emitState({ messages: this.messages });
    }

    // 5. Clear loading token but keep window visible
    if (
      loadingToken &&
      this.context.overlayLoadingTokenRef.current === loadingToken
    ) {
      this.context.overlayLoadingTokenRef.current = null;
    }

    // No storeTranscription - agent mode doesn't save to history
    return { shouldContinue: true };
  }

  async cleanup(): Promise<void> {
    // Clean up on exit
    this.messages = [];
    this.isFirstTurn = true;
    await emitTo("agent-overlay", "agent_overlay_phase", { phase: "idle" });
    await this.emitState(null);
  }
}
