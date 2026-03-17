import type { LlmToolCall, ToolInfo } from "@repo/types";
import type { AgentRunState } from "../state/agent.state";
import { getAppState } from "../store";
import { BaseAgent } from "./base.agent";

export class TestAgent extends BaseAgent {
  readonly agentType = "test";

  getTools(): ToolInfo[] {
    const state = getAppState();
    return Object.values(state.toolInfoById).filter(
      (t) => t.scope !== "pill",
    );
  }

  getSystemPrompt(): string {
    return [
      "You are a helpful assistant with access to tools.",
      "Use the available tools when needed to help the user.",
      "When you have completed the user's request, respond with your final answer.",
    ].join(" ");
  }

  shouldStop(agentState: AgentRunState, lastToolCalls: LlmToolCall[]): boolean {
    if (agentState.iteration >= agentState.maxIterations - 1) return true;
    if (lastToolCalls.some((tc) => tc.name === "end_conversation")) return true;
    return false;
  }
}
