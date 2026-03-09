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
import { getToneIdToUse, VERBATIM_TONE_ID } from "../utils/tone.utils";
import { getMyUserPreferences } from "../utils/user.utils";
import { BaseStrategy } from "./base.strategy";

export class DictationStrategy extends BaseStrategy {
  private streamedSegmentCount = 0;
  private streamedProcessedText = "";
  private pasteQueue: Promise<void> = Promise.resolve();

  shouldStoreTranscript(): boolean {
    return true;
  }

  get hasStreamedSegments(): boolean {
    return this.streamedSegmentCount > 0;
  }

  handleInterimSegment(segment: string): void {
    const state = getAppState();

    const realtimeEnabled =
      getMyUserPreferences(state)?.realtimeOutputEnabled ?? false;
    const toneId = getToneIdToUse(state);
    if (!realtimeEnabled || toneId !== VERBATIM_TONE_ID) {
      return;
    }

    const sanitized = this.sanitizeTranscript(segment);
    if (!sanitized) {
      return;
    }

    const isFirst = this.streamedSegmentCount === 0;
    this.streamedSegmentCount++;

    this.pasteQueue = this.pasteQueue.then(async () => {
      const text = sanitized;
      const textToPaste = (isFirst ? "" : " ") + text;
      this.streamedProcessedText += (isFirst ? "" : " ") + text;

      try {
        await invoke<void>("paste", { text: textToPaste, keybind: null });
      } catch (error) {
        getLogger().error(`Failed to paste interim segment: ${error}`);
      }
    });
  }

  private sanitizeTranscript(text: string): string | null {
    const state = getAppState();
    const replacementRules = Object.values(state.termById)
      .filter((term) => term.isReplacement)
      .map((term) => ({
        sourceValue: term.sourceValue,
        destinationValue: term.destinationValue,
      }));

    const afterReplacements = applyReplacements(text, replacementRules);
    return applySymbolConversions(afterReplacements);
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

  private async handleFinalStreamedTranscript(
    args: HandleTranscriptParams,
  ): Promise<HandleTranscriptResult> {
    const sanitizedTranscript = this.sanitizeTranscript(args.rawTranscript);

    await this.pasteQueue;
    try {
      await invoke<void>("paste", { text: " ", keybind: null });
    } catch {
      // Non-critical trailing space
    }

    const transcript = this.streamedProcessedText || sanitizedTranscript;
    getLogger().verbose(
      `Streaming dictation complete (${this.streamedSegmentCount} segments)`,
    );

    return {
      shouldContinue: false,
      transcript: transcript,
      sanitizedTranscript,
      postProcessMetadata: {},
      postProcessWarnings: [],
    };
  }

  private async handleFinalBulkTranscript(
    args: HandleTranscriptParams,
  ): Promise<HandleTranscriptResult> {
    let transcript: string | null = null;
    let sanitizedTranscript: string | null = null;
    let postProcessMetadata: PostProcessMetadata = {};
    let postProcessWarnings: string[] = [];

    try {
      sanitizedTranscript = this.sanitizeTranscript(args.rawTranscript);
      if (sanitizedTranscript) {
        const result = await postProcessTranscript({
          rawTranscript: sanitizedTranscript,
          toneId: args.toneId,
        });

        transcript = result.transcript;
        postProcessMetadata = result.metadata;
        postProcessWarnings = result.warnings;
      }

      if (transcript) {
        await new Promise<void>((resolve) => setTimeout(resolve, 20));
        try {
          const keybind = args.currentApp?.pasteKeybind ?? null;
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

  async handleTranscript(
    args: HandleTranscriptParams,
  ): Promise<HandleTranscriptResult> {
    if (this.hasStreamedSegments) {
      return this.handleFinalStreamedTranscript(args);
    } else {
      return this.handleFinalBulkTranscript(args);
    }
  }

  async cleanup(): Promise<void> {
    // Nothing to clean up for dictation
  }
}
