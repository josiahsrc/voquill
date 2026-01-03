import { invoke } from "@tauri-apps/api/core";
import { showErrorSnackbar } from "../actions/app.actions";
import { postProcessTranscript } from "../actions/transcribe.actions";
import type { OverlayPhase } from "../types/overlay.types";
import { BaseRecordingStrategy } from "./base-recording.strategy";
import type {
  CompleteParams,
  CompleteResult,
  PostProcessParams,
  PostProcessOutput,
} from "./recording.types";

export class DictationRecordingStrategy extends BaseRecordingStrategy {
  async onBeforeStart(): Promise<void> {
    // No special setup for dictation
  }

  async setPhase(phase: OverlayPhase): Promise<void> {
    await invoke<void>("set_phase", { phase });
  }

  async postProcess({
    rawTranscript,
    toneId,
    a11yInfo,
  }: PostProcessParams): Promise<PostProcessOutput> {
    return postProcessTranscript({ rawTranscript, toneId, a11yInfo });
  }

  async onComplete({
    transcript,
    currentApp,
    loadingToken,
  }: CompleteParams): Promise<CompleteResult> {
    // Set overlay to idle
    if (
      loadingToken &&
      this.context.overlayLoadingTokenRef.current === loadingToken
    ) {
      this.context.overlayLoadingTokenRef.current = null;
      await invoke<void>("set_phase", { phase: "idle" });
    }

    // Paste the transcript
    if (transcript) {
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      try {
        const keybind = currentApp?.pasteKeybind ?? null;
        await invoke<void>("paste", { text: transcript, keybind });
      } catch (error) {
        console.error("Failed to paste transcription", error);
        showErrorSnackbar("Unable to paste transcription.");
      }
    }

    // Dictation is always single-turn
    return { shouldContinue: false };
  }

  async cleanup(): Promise<void> {
    // Nothing to clean up for dictation
  }
}
