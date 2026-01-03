import { invoke } from "@tauri-apps/api/core";
import { showErrorSnackbar } from "../actions/app.actions";
import {
  postProcessTranscript,
  storeTranscription,
} from "../actions/transcribe.actions";
import type { OverlayPhase } from "../types/overlay.types";
import { BaseRecordingStrategy } from "./base-recording.strategy";
import type {
  HandleTranscriptParams,
  HandleTranscriptResult,
} from "./recording.types";

export class DictationRecordingStrategy extends BaseRecordingStrategy {
  async onBeforeStart(): Promise<void> {
    // No special setup for dictation
  }

  async setPhase(phase: OverlayPhase): Promise<void> {
    await invoke<void>("set_phase", { phase });
  }

  async handleTranscript({
    rawTranscript,
    toneId,
    a11yInfo,
    currentApp,
    loadingToken,
    audio,
  }: HandleTranscriptParams): Promise<HandleTranscriptResult> {
    // 1. Post-process the transcript
    const { transcript, metadata, warnings } = await postProcessTranscript({
      rawTranscript,
      toneId,
      a11yInfo,
    });

    // 2. Store transcription (don't await - don't block pasting)
    storeTranscription({
      audio,
      rawTranscript,
      transcript,
      transcriptionMetadata: {},
      postProcessMetadata: metadata,
      warnings,
    });

    // 3. Set overlay to idle
    if (
      loadingToken &&
      this.context.overlayLoadingTokenRef.current === loadingToken
    ) {
      this.context.overlayLoadingTokenRef.current = null;
      await invoke<void>("set_phase", { phase: "idle" });
    }

    // 4. Paste the transcript
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
