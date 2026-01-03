import { emitTo } from "@tauri-apps/api/event";
import { Agent } from "../agent/agent";
import { AgentMessage } from "../types/agent.types";
import { getAgentRepo } from "../repos";
import type {
  AgentWindowMessage,
  AgentWindowState,
} from "../types/agent-window.types";
import type { OverlayPhase } from "../types/overlay.types";
import { BaseRecordingStrategy } from "./base-recording.strategy";
import type {
  HandleTranscriptParams,
  HandleTranscriptResult,
} from "./recording.types";
import { GetAccessibilityInfoTool } from "../tools/get-accessibility-info.tool";
import { ShowToastTool } from "../tools/show-toast.tool";
import { StopTool } from "../tools/stop.tool";

export class AgentRecordingStrategy extends BaseRecordingStrategy {
  private history: AgentMessage[] = [];
  private uiMessages: AgentWindowMessage[] = [];
  private isFirstTurn = true;
  private agent: Agent | null = null;
  private shouldStop = false;

  private async emitState(state: AgentWindowState | null): Promise<void> {
    await emitTo("agent-overlay", "agent_window_state", { state });
  }

  private initAgent(): Agent | null {
    const { repo, warnings } = getAgentRepo();
    if (!repo) {
      console.warn("No agent repo configured:", warnings);
      return null;
    }

    const tools = [
      new ShowToastTool(),
      new GetAccessibilityInfoTool(),
      new StopTool(() => {
        this.shouldStop = true;
      }),
    ];

    return new Agent(repo, tools);
  }

  async onBeforeStart(): Promise<void> {
    if (this.isFirstTurn) {
      await this.emitState(null);
      this.isFirstTurn = false;
      this.agent = this.initAgent();
    }
  }

  async setPhase(phase: OverlayPhase): Promise<void> {
    await emitTo("agent-overlay", "agent_overlay_phase", { phase });
  }

  async handleTranscript({
    rawTranscript,
    loadingToken,
  }: HandleTranscriptParams): Promise<HandleTranscriptResult> {
    if (!this.agent) {
      this.agent = this.initAgent();
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

    const result = await this.agent.run(this.history, rawTranscript);
    console.log("Agent response:", result.response);
    console.log("Tool calls:", result.toolCalls);

    this.history.push({ role: "user", content: rawTranscript });
    this.history.push({ role: "assistant", content: result.response });

    if (result.response) {
      this.uiMessages.push({ text: result.response, sender: "agent" });
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
    this.history = [];
    this.uiMessages = [];
    this.isFirstTurn = true;
    this.agent = null;
    this.shouldStop = false;
    await emitTo("agent-overlay", "agent_overlay_phase", { phase: "idle" });
    await this.emitState(null);
  }
}
