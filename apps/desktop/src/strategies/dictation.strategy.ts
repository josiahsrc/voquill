import type { Nullable } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { showErrorSnackbar } from "../actions/app.actions";
import { showToast } from "../actions/toast.actions";
import {
  postProcessTranscript,
  storeTranscription,
} from "../actions/transcribe.actions";
import { getIntl } from "../i18n";
import { getAppState } from "../store";
import type { OverlayPhase } from "../types/overlay.types";
import type {
  HandleTranscriptParams,
  HandleTranscriptResult,
  StrategyValidationError,
} from "../types/strategy.types";
import { getMemberExceedsLimitByState } from "../utils/member.utils";
import { BaseStrategy } from "./base.strategy";

export class DictationStrategy extends BaseStrategy {
  validateAvailability(): Nullable<StrategyValidationError> {
    const state = getAppState();

    const transcriptionMode = state.settings.aiTranscription.mode;
    const generativeMode = state.settings.aiPostProcessing.mode;
    const isCloud = transcriptionMode === "cloud" || generativeMode === "cloud";
    if (isCloud && getMemberExceedsLimitByState(state)) {
      return {
        title: getIntl().formatMessage({
          defaultMessage: "Word limit reached",
        }),
        body: getIntl().formatMessage({
          defaultMessage: "You've used all your free words for today.",
        }),
        action: "upgrade",
      };
    }

    return null;
  }

  async onBeforeStart(): Promise<void> {
    // No special setup for dictation
  }

  async setPhase(phase: OverlayPhase): Promise<void> {
    await invoke<void>("set_phase", { phase });
  }

  async handleTranscript({
    rawTranscript,
    processedTranscript,
    toneId,
    a11yInfo,
    currentApp,
    loadingToken,
    audio,
    transcriptionMetadata,
    postProcessMetadata: sessionPostProcessMetadata,
    transcriptionWarnings,
  }: HandleTranscriptParams): Promise<HandleTranscriptResult> {
    const resetPhase = async () => {
      if (
        loadingToken &&
        this.context.overlayLoadingTokenRef.current === loadingToken
      ) {
        this.context.overlayLoadingTokenRef.current = null;
        await invoke<void>("set_phase", { phase: "idle" });
      }
    };

    try {
      let transcript: string;
      let postProcessMetadata = sessionPostProcessMetadata ?? {};
      let postProcessWarnings: string[] = [];

      // Use processed transcript from session if available (v2 cloud backend)
      // Otherwise run local post-processing (v1 cloud backend, API, or local)
      if (processedTranscript) {
        transcript = processedTranscript;
      } else {
        const result = await postProcessTranscript({
          rawTranscript,
          toneId,
          a11yInfo,
        });
        transcript = result.transcript;
        postProcessMetadata = result.metadata;
        postProcessWarnings = result.warnings;
      }

      // Store transcription (don't await - don't block pasting)
      storeTranscription({
        audio,
        rawTranscript,
        transcript,
        transcriptionMetadata,
        postProcessMetadata,
        warnings: [...transcriptionWarnings, ...postProcessWarnings],
      });

      // 3. Set overlay to idle
      await resetPhase();

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
    } catch (error) {
      console.error("Failed to process transcription", error);
      await showToast({
        title: "Transcription failed",
        message: error instanceof Error ? error.message : "An error occurred.",
        toastType: "error",
      });
      await resetPhase();
    }

    // Dictation is always single-turn
    return { shouldContinue: false };
  }

  async cleanup(): Promise<void> {
    // Nothing to clean up for dictation
  }
}
