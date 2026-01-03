import { Agent } from "@mastra/core/agent";
import type { CoreMessage } from "@mastra/core/llm";
import { getGenerateTextRepo } from "../repos";
import { voquillModel } from "./provider";
import { agentTools } from "./tools";

export { VoquillLanguageModel } from "./language-model";
export {
  voquillModel,
  voquillProvider,
  type VoquillProvider,
} from "./provider";
export type {
  AiSdkGenerateOptions,
  AiSdkGenerateResult,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3FunctionTool,
  LanguageModelV3GenerateResult,
  LanguageModelV3Prompt,
  LanguageModelV3ToolChoice,
  LanguageModelV3Usage,
} from "./types";

export type AgentTurnResult = {
  text: string;
  shouldStop: boolean;
  stopReason?: string;
};

export class VoquillAgent {
  private agent: Agent;
  private messages: CoreMessage[] = [];

  constructor() {
    const repo = getGenerateTextRepo().repo;
    if (!repo) {
      throw new Error("GenerateTextRepo is not available");
    }

    this.agent = new Agent({
      name: "voquill",
      id: "voquill-agent",
      instructions: {
        role: "system",
        content: `You are a helpful voice assistant. Keep responses concise and conversational.
When the user wants to end the conversation or says goodbye, use the stop tool.
You can use console_log to debug and show_toast to notify the user of important information.`,
      },
      model: voquillModel(repo),
      tools: agentTools,
    });
  }

  async turn(userMessage: string): Promise<AgentTurnResult> {
    this.messages.push({
      role: "user",
      content: userMessage,
    });

    const result = await this.agent.generate(this.messages, {
      maxSteps: 5,
    });

    let shouldStop = false;
    let stopReason: string | undefined;

    for (const toolCall of result.toolCalls) {
      if (toolCall.payload.toolName === "stop") {
        shouldStop = true;
        const toolResult = result.toolResults.find(
          (r) => r.payload.toolCallId === toolCall.payload.toolCallId,
        );
        if (
          toolResult?.payload.result &&
          typeof toolResult.payload.result === "object"
        ) {
          const res = toolResult.payload.result as { reason?: string };
          stopReason = res.reason;
        }
      }
    }

    const responseText = result.text;

    this.messages.push({
      role: "assistant",
      content: responseText,
    });

    return {
      text: responseText,
      shouldStop,
      stopReason,
    };
  }

  reset(): void {
    this.messages = [];
  }
}

export const createAgent = (): Agent => {
  const repo = getGenerateTextRepo().repo;
  if (!repo) {
    throw new Error("GenerateTextRepo is not available");
  }

  return new Agent({
    name: "voquill",
    id: "voquill-agent",
    instructions: {
      role: "system",
      content: "You are a helpful assistant",
    },
    model: voquillModel(repo),
    tools: agentTools,
  });
};
