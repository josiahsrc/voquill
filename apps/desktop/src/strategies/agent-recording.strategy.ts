import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { emitTo } from "@tauri-apps/api/event";
import { createAgent } from "langchain";
import { RepoModel } from "../agent/model";
import { createAgentTools } from "../agent/tools";
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

export class AgentRecordingStrategy extends BaseRecordingStrategy {
  private uiMessages: AgentWindowMessage[] = [];
  private agentMessages: BaseMessage[] = [];
  private agent: ReturnType<typeof createAgent> | null = null;
  private isFirstTurn = true;
  private stopRequested = false;

  private async emitState(state: AgentWindowState | null): Promise<void> {
    await emitTo("agent-overlay", "agent_window_state", { state });
  }

  private initializeAgent(): boolean {
    if (this.agent) return true;

    const { repo } = getAgentRepo();
    if (!repo) {
      console.error("No agent repo available");
      return false;
    }

    const model = new RepoModel(repo);
    const tools = createAgentTools({
      onStop: () => {
        this.stopRequested = true;
      },
    });

    this.agent = createAgent({
      model,
      tools,
      systemPrompt:
        "You are a helpful AI assistant. Keep your responses concise and relevant. When appropriate, use your available tools to help the user. If the user wants to stop, exit, or end the conversation, use the stop tool.",
    });

    return true;
  }

  async onBeforeStart(): Promise<void> {
    if (this.isFirstTurn) {
      // First turn: clear any previous state and initialize agent
      await this.emitState(null);
      this.stopRequested = false;
      this.agentMessages = [];
      this.initializeAgent();
      this.isFirstTurn = false;
    }
    // Subsequent turns: window is already open, nothing to do
  }

  async setPhase(phase: OverlayPhase): Promise<void> {
    await emitTo("agent-overlay", "agent_overlay_phase", { phase });
  }

  async handleTranscript({
    rawTranscript,
    loadingToken,
  }: HandleTranscriptParams): Promise<HandleTranscriptResult> {
    // Ensure agent is initialized
    if (!this.initializeAgent() || !this.agent) {
      console.error("Failed to initialize agent");
      return { shouldContinue: false };
    }

    // Reset stop flag before processing
    this.stopRequested = false;

    // Add user's message ("me") and emit immediately
    this.uiMessages.push({ text: rawTranscript, sender: "me" });
    await this.emitState({ messages: this.uiMessages });

    // Add to agent messages and invoke
    this.agentMessages.push(new HumanMessage(rawTranscript));

    const result = await this.agent.invoke({
      messages: this.agentMessages,
    });

    // Update agent messages with the full conversation
    this.agentMessages = result.messages;

    // Extract the final AI response
    const lastMessage = this.agentMessages[this.agentMessages.length - 1];
    const agentResponse =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    console.log("Agent response:", agentResponse);

    // Add agent's response and emit (if there's content)
    if (agentResponse) {
      this.uiMessages.push({ text: agentResponse, sender: "agent" });
      await this.emitState({ messages: this.uiMessages });
    }

    // Clear loading token but keep window visible
    if (
      loadingToken &&
      this.context.overlayLoadingTokenRef.current === loadingToken
    ) {
      this.context.overlayLoadingTokenRef.current = null;
    }

    // Check if stop was requested via the Stop tool
    if (this.stopRequested) {
      await emitTo("agent-overlay", "agent_overlay_phase", { phase: "idle" });
      await this.emitState(null);
      return { shouldContinue: false };
    }

    // No storeTranscription - agent mode doesn't save to history
    return { shouldContinue: true };
  }

  async cleanup(): Promise<void> {
    // Clean up on exit
    this.uiMessages = [];
    this.agentMessages = [];
    this.agent = null;
    this.isFirstTurn = true;
    this.stopRequested = false;
    await emitTo("agent-overlay", "agent_overlay_phase", { phase: "idle" });
    await this.emitState(null);
  }
}
