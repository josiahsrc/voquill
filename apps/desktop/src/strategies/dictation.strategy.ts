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
import { getLogger } from "../utils/log.utils";
import { getMemberExceedsLimitByState } from "../utils/member.utils";
import {
  applyReplacements,
  applySymbolConversions,
} from "../utils/string.utils";
import { BaseStrategy } from "./base.strategy";

export class DictationStrategy extends BaseStrategy {
  private streamedSegmentCount = 0;
  private streamedProcessedText = "";
  private streamingPostProcess = false;
  private streamingToneId: string | null = null;
  private pasteQueue: Promise<void> = Promise.resolve();

  shouldStoreTranscript(): boolean {
    return true;
  }

  get hasStreamedSegments(): boolean {
    return this.streamedSegmentCount > 0;
  }

  configureStreamingPostProcess(toneId: string | null): void {
    this.streamingPostProcess = true;
    this.streamingToneId = toneId;
  }

  handleInterimSegment(segment: string): void {
    const state = getAppState();
    const replacementRules = Object.values(state.termById)
      .filter((term) => term.isReplacement)
      .map((term) => ({
        sourceValue: term.sourceValue,
        destinationValue: term.destinationValue,
      }));

    const afterReplacements = applyReplacements(segment, replacementRules);
    const sanitized = applySymbolConversions(afterReplacements);

    if (!sanitized) return;

    const isFirst = this.streamedSegmentCount === 0;
    this.streamedSegmentCount++;

    this.pasteQueue = this.pasteQueue.then(async () => {
      let text = sanitized;

      if (this.streamingPostProcess) {
        try {
          const result = await postProcessTranscript({
            rawTranscript: sanitized,
            toneId: this.streamingToneId,
            precedingContext: this.streamedProcessedText || undefined,
          });
          text = result.transcript;
        } catch (error) {
          getLogger().error(`Failed to post-process segment: ${error}`);
        }
      }

      const textToPaste = (isFirst ? "" : " ") + text;
      this.streamedProcessedText += (isFirst ? "" : " ") + text;

      try {
        await invoke<void>("paste", { text: textToPaste, keybind: null });
      } catch (error) {
        getLogger().error(`Failed to paste interim segment: ${error}`);
      }
    });
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
  }: HandleTranscriptParams): Promise<HandleTranscriptResult> {
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

      getLogger().verbose(
        `Applying ${replacementRules.length} replacement rules`,
      );
      const afterReplacements = applyReplacements(
        rawTranscript,
        replacementRules,
      );
      sanitizedTranscript = applySymbolConversions(afterReplacements);

      if (this.hasStreamedSegments) {
        await this.pasteQueue;
        try {
          await invoke<void>("paste", { text: " ", keybind: null });
        } catch {
          // Non-critical trailing space
        }
        transcript = this.streamedProcessedText || sanitizedTranscript;
        getLogger().info(
          `Streaming dictation complete (${this.streamedSegmentCount} segments, postProcessed=${this.streamingPostProcess})`,
        );
      } else if (processedTranscript && sessionPostProcessMetadata) {
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

      if (transcript && !this.hasStreamedSegments) {
        await new Promise<void>((resolve) => setTimeout(resolve, 20));
        try {
          const keybind = currentApp?.pasteKeybind ?? null;
          getLogger().verbose(
            `Pasting transcript (${transcript.length} chars, keybind=${keybind ?? "default"})`,
          );

          const textToPaste = transcript.trim() + " ";
          await invoke<void>("paste", { text: textToPaste, keybind });

          getLogger().info("Transcript pasted successfully");
        } catch (error) {
          getLogger().error(`Failed to paste transcription: ${error}`);
          showErrorSnackbar("Unable to paste transcription.");
        }
      }
    } catch (error) {
      getLogger().error(`Failed to process transcription: ${error}`);

      const errorMessage =
        error instanceof Error ? error.message : "An error occurred.";
      postProcessWarnings.push(errorMessage);

      await showToast({
        title: "Transcription failed",
        message: errorMessage,
        toastType: "error",
      });
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
