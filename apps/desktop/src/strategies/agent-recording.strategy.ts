import { emitTo } from "@tauri-apps/api/event";
import { VoquillAgent } from "../agent";
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
  private agent: VoquillAgent | null = null;

  private async emitState(state: AgentWindowState | null): Promise<void> {
    await emitTo("agent-overlay", "agent_window_state", { state });
  }

  async onBeforeStart(): Promise<void> {
    if (this.isFirstTurn) {
      await this.emitState(null);
      this.agent = new VoquillAgent();
      this.isFirstTurn = false;
    }
  }

  async setPhase(phase: OverlayPhase): Promise<void> {
    await emitTo("agent-overlay", "agent_overlay_phase", { phase });
  }

  async handleTranscript({
    rawTranscript,
    loadingToken,
  }: HandleTranscriptParams): Promise<HandleTranscriptResult> {
    if (!this.agent) {
      throw new Error("Agent is not initialized");
    }

    this.messages.push({ text: rawTranscript, sender: "me" });
    await this.emitState({ messages: this.messages });

    const result = await this.agent.turn(rawTranscript);
    console.log("Agent response:", result.text, "shouldStop:", result.shouldStop);

    if (result.text) {
      this.messages.push({ text: result.text, sender: "agent" });
      await this.emitState({ messages: this.messages });
    }

    if (
      loadingToken &&
      this.context.overlayLoadingTokenRef.current === loadingToken
    ) {
      this.context.overlayLoadingTokenRef.current = null;
    }

    if (result.shouldStop) {
      await emitTo("agent-overlay", "agent_overlay_phase", { phase: "idle" });
      await this.emitState(null);
      return { shouldContinue: false };
    }

    return { shouldContinue: true };
  }

  async cleanup(): Promise<void> {
    this.messages = [];
    this.isFirstTurn = true;
    this.agent?.reset();
    this.agent = null;
    await emitTo("agent-overlay", "agent_overlay_phase", { phase: "idle" });
    await this.emitState(null);
  }
}
