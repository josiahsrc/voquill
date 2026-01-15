import type { Nullable } from "@repo/types";
import { emitTo } from "@tauri-apps/api/event";
import { showToast } from "../actions/toast.actions";
import { Agent } from "../agent/agent";
import { getIntl } from "../i18n";
import { getAgentRepo } from "../repos";
import { getAppState } from "../store";
import { DraftTool } from "../tools/draft.tool";
import { GetContextTool } from "../tools/get-context.tool";
import { getToolsForServers } from "../tools/mcp.tool";
import { StopTool } from "../tools/stop.tool";
import { WriteToTextFieldTool } from "../tools/write-to-text-field.tool";
import type {
  AgentWindowMessage,
  AgentWindowState,
} from "../types/agent-window.types";
import type { OverlayPhase } from "../types/overlay.types";
import type {
  HandleTranscriptParams,
  HandleTranscriptResult,
  StrategyValidationError,
} from "../types/strategy.types";
import { getMemberExceedsLimitByState } from "../utils/member.utils";
import { BaseStrategy } from "./base.strategy";

export class AgentStrategy extends BaseStrategy {
  private uiMessages: AgentWindowMessage[] = [];
  private isFirstTurn = true;
  private agent: Agent | null = null;
  private shouldStop = false;
  private writeToTextFieldTool: WriteToTextFieldTool | null = null;
  private stopTool: StopTool | null = null;
  private draftTool: DraftTool | null = null;
  private currentDraft: string | null = null;

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

    return null;
  }

  private async emitState(state: AgentWindowState | null): Promise<void> {
    await emitTo("unified-overlay", "agent_window_state", { state });
  }

  private async initAgent(): Promise<Agent | null> {
    const { repo, warnings } = getAgentRepo();
    if (!repo) {
      console.warn("No agent repo configured:", warnings);
      return null;
    }

    const mcpTools = await getToolsForServers([
      // {
      //   url: "https://api.githubcopilot.com/mcp/",
      //   headers: {
      //     Authorization: `Bearer todo`,
      //   },
      // },
    ]);

    this.stopTool = new StopTool(() => {
      this.shouldStop = true;
    });

    this.draftTool = new DraftTool();
    this.draftTool.setOnDraftUpdated((draft) => {
      this.currentDraft = draft;
      this.emitState({ messages: this.uiMessages }).catch(console.error);
    });

    this.writeToTextFieldTool = new WriteToTextFieldTool();
    this.writeToTextFieldTool.setStopTool(this.stopTool);
    this.writeToTextFieldTool.setDraftTool(this.draftTool);

    const tools = [
      new GetContextTool(),
      this.draftTool,
      this.writeToTextFieldTool,
      this.stopTool,
      ...mcpTools,
    ];

    return new Agent(repo, tools);
  }

  async onBeforeStart(): Promise<void> {
    if (this.isFirstTurn) {
      await this.emitState(null);
      this.isFirstTurn = false;
      this.agent = await this.initAgent();
    }
  }

  async setPhase(phase: OverlayPhase): Promise<void> {
    await emitTo("unified-overlay", "agent_overlay_phase", { phase });
  }

  async handleTranscript({
    rawTranscript,
    loadingToken,
    currentApp,
  }: HandleTranscriptParams): Promise<HandleTranscriptResult> {
    const clearLoadingToken = () => {
      if (
        loadingToken &&
        this.context.overlayLoadingTokenRef.current === loadingToken
      ) {
        this.context.overlayLoadingTokenRef.current = null;
      }
    };

    if (!this.agent) {
      this.agent = await this.initAgent();
      if (!this.agent) {
        clearLoadingToken();
        return { shouldContinue: false };
      }
    }

    try {
      this.writeToTextFieldTool?.setPasteKeybind(
        currentApp?.pasteKeybind ?? null,
      );

      this.uiMessages.push({ text: rawTranscript, sender: "me" });
      await this.emitState({ messages: this.uiMessages });

      const liveTools: string[] = [];
      this.uiMessages.push({ text: "", sender: "agent", tools: liveTools });

      const result = await this.agent.run(rawTranscript, {
        onToolExecuted: (tool) => {
          liveTools.push(tool.displayName);
          this.emitState({ messages: this.uiMessages }).catch(console.error);
        },
      });
      console.log("Agent response:", result.response);
      console.log("Agent history:", result.history);

      this.uiMessages.pop();

      if (result.response) {
        const lastHistoryMessage = result.history[result.history.length - 1];
        const toolDisplayNames =
          lastHistoryMessage?.type === "assistant"
            ? lastHistoryMessage.tools.map((t) => t.displayName)
            : [];

        this.uiMessages.push({
          text: result.response,
          sender: "agent",
          isError: result.isError,
          tools: toolDisplayNames,
          draft: this.currentDraft ?? undefined,
        });
        this.currentDraft = null;
        await this.emitState({ messages: this.uiMessages });
      }

      clearLoadingToken();

      if (this.shouldStop) {
        await this.cleanup();
        return { shouldContinue: false };
      }

      return { shouldContinue: true };
    } catch (error) {
      console.error("Agent failed to process request", error);
      await showToast({
        title: "Agent request failed",
        message: error instanceof Error ? error.message : "An error occurred.",
        toastType: "error",
      });
      clearLoadingToken();
      await this.cleanup();
      return { shouldContinue: false };
    }
  }

  async cleanup(): Promise<void> {
    this.agent?.clearHistory();
    this.uiMessages = [];
    this.isFirstTurn = true;
    this.agent = null;
    this.shouldStop = false;
    this.writeToTextFieldTool = null;
    this.draftTool = null;
    this.currentDraft = null;
    await emitTo("unified-overlay", "agent_overlay_phase", { phase: "idle" });
    await this.emitState(null);
  }
}
