import { emitTo } from "@tauri-apps/api/event";
import { Agent } from "../agent/agent";
import { getAgentRepo } from "../repos";
import { GetScreenContextTool } from "../tools/get-screen-context.tool";
import { GetTextFieldInfoTool } from "../tools/get-text-field-info.tool";
import { getToolsForServers } from "../tools/mcp.tool";
import { ShowToastTool } from "../tools/show-toast.tool";
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
} from "../types/strategy.types";
import { BaseStrategy } from "./base.strategy";

export class AgentStrategy extends BaseStrategy {
  private uiMessages: AgentWindowMessage[] = [];
  private isFirstTurn = true;
  private agent: Agent | null = null;
  private shouldStop = false;

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

    const tools = [
      new ShowToastTool(),
      new GetTextFieldInfoTool(),
      new GetScreenContextTool(),
      new WriteToTextFieldTool(),
      new StopTool(() => {
        this.shouldStop = true;
      }),
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
  }: HandleTranscriptParams): Promise<HandleTranscriptResult> {
    if (!this.agent) {
      this.agent = await this.initAgent();
      if (!this.agent) {
        if (
          loadingToken &&
          this.context.overlayLoadingTokenRef.current === loadingToken
        ) {
          this.context.overlayLoadingTokenRef.current = null;
        }
        return { shouldContinue: false };
      }
    }

    this.uiMessages.push({ text: rawTranscript, sender: "me" });
    await this.emitState({ messages: this.uiMessages });

    const result = await this.agent.run(rawTranscript);
    console.log("Agent response:", result.response);
    console.log("Agent history:", result.history);

    if (result.response) {
      this.uiMessages.push({
        text: result.response,
        sender: "agent",
        isError: result.isError,
      });
      await this.emitState({ messages: this.uiMessages });
    }

    if (
      loadingToken &&
      this.context.overlayLoadingTokenRef.current === loadingToken
    ) {
      this.context.overlayLoadingTokenRef.current = null;
    }

    if (this.shouldStop) {
      await this.cleanup();
      return { shouldContinue: false };
    }

    return { shouldContinue: true };
  }

  async cleanup(): Promise<void> {
    this.agent?.clearHistory();
    this.uiMessages = [];
    this.isFirstTurn = true;
    this.agent = null;
    this.shouldStop = false;
    await emitTo("unified-overlay", "agent_overlay_phase", { phase: "idle" });
    await this.emitState(null);
  }
}
