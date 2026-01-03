import { emitTo } from "@tauri-apps/api/event";
import { processWithAgent } from "../actions/transcribe.actions";
import type { OverlayPhase } from "../types/overlay.types";
import { BaseRecordingStrategy } from "./base-recording.strategy";
import type {
  CompleteParams,
  CompleteResult,
  PostProcessParams,
  PostProcessOutput,
} from "./recording.types";

export class AgentRecordingStrategy extends BaseRecordingStrategy {
  private transcripts: string[] = [];
  private isFirstTurn = true;

  private async emitTranscript(transcript: string | null): Promise<void> {
    await emitTo("agent-overlay", "agent_overlay_transcript", { transcript });
  }

  async onBeforeStart(): Promise<void> {
    if (this.isFirstTurn) {
      // First turn: clear any previous transcript
      await this.emitTranscript(null);
      this.isFirstTurn = false;
    }
    // Subsequent turns: window is already open, nothing to do
  }

  async setPhase(phase: OverlayPhase): Promise<void> {
    await emitTo("agent-overlay", "agent_overlay_phase", { phase });
  }

  async postProcess({
    rawTranscript,
    toneId,
  }: PostProcessParams): Promise<PostProcessOutput> {
    return processWithAgent({ rawTranscript, toneId });
  }

  async onComplete({
    transcript,
    loadingToken,
  }: CompleteParams): Promise<CompleteResult> {
    // Check for exit command
    const shouldExit = transcript?.toLowerCase().includes("stop") ?? false;

    if (shouldExit) {
      // Exit: close the window
      if (
        loadingToken &&
        this.context.overlayLoadingTokenRef.current === loadingToken
      ) {
        this.context.overlayLoadingTokenRef.current = null;
      }
      await emitTo("agent-overlay", "agent_overlay_phase", { phase: "idle" });
      await this.emitTranscript(null);
      return { shouldContinue: false };
    }

    // Continue: add transcript to the stack and keep window open
    if (transcript) {
      this.transcripts.push(transcript);
      await this.emitTranscript(this.transcripts.join("\n\n"));
    }

    // Clear loading token but DON'T set phase to idle - keep window visible
    if (
      loadingToken &&
      this.context.overlayLoadingTokenRef.current === loadingToken
    ) {
      this.context.overlayLoadingTokenRef.current = null;
    }
    // Window stays open in current phase, ready for next turn

    return { shouldContinue: true };
  }

  async cleanup(): Promise<void> {
    // Clean up on exit
    this.transcripts = [];
    this.isFirstTurn = true;
    await emitTo("agent-overlay", "agent_overlay_phase", { phase: "idle" });
    await this.emitTranscript(null);
  }
}
