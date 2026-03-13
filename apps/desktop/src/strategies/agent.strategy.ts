import type { Nullable } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { createConversation, sendChatMessage } from "../actions/chat.actions";
import { showToast } from "../actions/toast.actions";
import { getIntl } from "../i18n";
import { getAppState, produceAppState } from "../store";
import type { OverlayPhase } from "../types/overlay.types";
import type {
  HandleTranscriptParams,
  HandleTranscriptResult,
  StrategyValidationError,
} from "../types/strategy.types";
import { createId } from "../utils/id.utils";
import { getLogger } from "../utils/log.utils";
import { getMemberExceedsLimitByState } from "../utils/member.utils";
import { BaseStrategy } from "./base.strategy";

export class AgentStrategy extends BaseStrategy {
  private conversationId: string | null = null;

  shouldStoreTranscript(): boolean {
    return false;
  }

  validateAvailability(): Nullable<StrategyValidationError> {
    const state = getAppState();
    const agentMode = state.settings.agentMode.mode;
    if (agentMode === "none") {
      return {
        title: getIntl().formatMessage({
          defaultMessage: "Agent mode disabled",
        }),
        body: getIntl().formatMessage({
          defaultMessage: "Enable agent mode in settings to use this feature.",
        }),
        action: "open_agent_settings",
      };
    }

    if (agentMode === "cloud" && getMemberExceedsLimitByState(state)) {
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

    if (state.aiSidecar.status !== "running") {
      return {
        title: getIntl().formatMessage({
          defaultMessage: "AI not available",
        }),
        body: getIntl().formatMessage({
          defaultMessage:
            "The AI assistant is not running. Please check your settings.",
        }),
        action: "open_agent_settings",
      };
    }

    return null;
  }

  async onBeforeStart(): Promise<void> {
    if (!this.conversationId) {
      const now = new Date().toISOString();
      const conversation = await createConversation({
        id: createId(),
        title: getIntl().formatMessage({
          defaultMessage: "New conversation",
        }),
        createdAt: now,
        updatedAt: now,
      });
      this.conversationId = conversation.id;
      produceAppState((draft) => {
        draft.pillConversationId = conversation.id;
      });
    }
  }

  async setPhase(phase: OverlayPhase): Promise<void> {
    await invoke<void>("set_phase", { phase });
  }

  async handleTranscript({
    rawTranscript,
  }: HandleTranscriptParams): Promise<HandleTranscriptResult> {
    if (!this.conversationId) {
      return {
        shouldContinue: false,
        transcript: null,
        sanitizedTranscript: null,
        postProcessMetadata: {},
        postProcessWarnings: [],
      };
    }

    try {
      getLogger().info(
        `Sending chat message (${rawTranscript.length} chars)`,
      );
      await sendChatMessage(this.conversationId, rawTranscript);

      return {
        shouldContinue: true,
        transcript: null,
        sanitizedTranscript: null,
        postProcessMetadata: {},
        postProcessWarnings: [],
      };
    } catch (error) {
      getLogger().error(`Chat message failed: ${error}`);
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred.";
      await showToast({
        title: getIntl().formatMessage({
          defaultMessage: "Chat request failed",
        }),
        message: errorMessage,
        toastType: "error",
      });
      return {
        shouldContinue: true,
        transcript: null,
        sanitizedTranscript: null,
        postProcessMetadata: {},
        postProcessWarnings: [],
      };
    }
  }

  async cleanup(): Promise<void> {
    getLogger().verbose("Cleaning up agent strategy");
    this.conversationId = null;
    produceAppState((draft) => {
      draft.pillConversationId = null;
    });
  }
}
