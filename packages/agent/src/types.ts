import type {
  JSONSchema,
  LlmChatInput,
  LlmMessage,
  LlmStreamEvent,
} from "@repo/types";

export interface AgentToolInput {
  params: Record<string, unknown>;
  reason: string;
}

export interface AgentToolOutput {
  success: boolean;
  failureReason?: string;
  result?: unknown;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (input: AgentToolInput) => Promise<AgentToolOutput>;
}

export interface AgentLlmProvider {
  streamChat(input: LlmChatInput): AsyncGenerator<LlmStreamEvent>;
}

export type AgentFinishReason =
  | "stop"
  | "max-iterations"
  | "aborted"
  | "error";

export type AgentEvent =
  | { type: "text-delta"; text: string }
  | {
      type: "tool-call-start";
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    }
  | {
      type: "tool-call-result";
      toolCallId: string;
      toolName: string;
      result: string;
      isError: boolean;
    }
  | { type: "iteration-start"; iteration: number }
  | {
      type: "finish";
      reason: AgentFinishReason;
      text: string;
      messages: LlmMessage[];
      error?: string;
    };

export interface AgentConfig {
  provider: AgentLlmProvider;
  tools: AgentTool[];
  systemPrompt: string;
  maxIterations?: number;
}
