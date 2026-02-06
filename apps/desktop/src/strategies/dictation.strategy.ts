import type { Nullable } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { showErrorSnackbar } from "../actions/app.actions";
import { showToast } from "../actions/toast.actions";
import {
  postProcessTranscript,
  type PostProcessMetadata,
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
import {
  applyReplacements,
  applySymbolConversions,
} from "../utils/string.utils";
import { BaseStrategy } from "./base.strategy";

export class DictationStrategy extends BaseStrategy {
  shouldStoreTranscript(): boolean {
    return true;
  }

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
    sessionPostProcessMetadata,
    toneId,
    currentApp,
    loadingToken,
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

    let transcript: string | null = null;
    let sanitizedTranscript: string | null = null;
    let postProcessMetadata: PostProcessMetadata = {};
    let postProcessWarnings: string[] = [];

    try {
      const state = getAppState();
      const replacementRules = Object.values(state.termById)
        .filter((term) => term.isReplacement)
        .map((term) => ({
          sourceValue: term.sourceValue,
          destinationValue: term.destinationValue,
        }));

      const afterReplacements = applyReplacements(
        rawTranscript,
        replacementRules,
      );
      sanitizedTranscript = applySymbolConversions(afterReplacements);

      if (processedTranscript && sessionPostProcessMetadata) {
        const afterProcessedReplacements = applyReplacements(
          processedTranscript,
          replacementRules,
        );
        transcript = applySymbolConversions(afterProcessedReplacements);
        postProcessMetadata = sessionPostProcessMetadata;
      } else {
        const result = await postProcessTranscript({
          rawTranscript: sanitizedTranscript,
          toneId,
        });

        transcript = result.transcript;
        postProcessMetadata = result.metadata;
        postProcessWarnings = result.warnings;
      }

      await resetPhase();

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

      const errorMessage =
        error instanceof Error ? error.message : "An error occurred.";
      postProcessWarnings.push(errorMessage);

      await showToast({
        title: "Transcription failed",
        message: errorMessage,
        toastType: "error",
      });
      await resetPhase();
    }

    return {
      shouldContinue: false,
      transcript,
      sanitizedTranscript,
      postProcessMetadata,
      postProcessWarnings,
    };
  }

  async cleanup(): Promise<void> {
    // Nothing to clean up for dictation
  }
}
