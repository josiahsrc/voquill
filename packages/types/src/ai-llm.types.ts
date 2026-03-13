import type { JSONSchema } from "./json-schema.types";

export type LlmMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content?: string | null;
      toolCalls?: LlmToolCall[];
    }
  | { role: "tool"; toolCallId: string; content: string };

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LlmTool {
  name: string;
  description?: string;
  parameters?: JSONSchema;
}

export type LlmToolChoice =
  | "auto"
  | "none"
  | "required"
  | { name: string };

export interface LlmChatInput {
  messages: LlmMessage[];
  tools?: LlmTool[];
  toolChoice?: LlmToolChoice;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
}

export type LlmStreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; id: string; name: string; arguments: string }
  | {
      type: "finish";
      finishReason: LlmFinishReason;
      usage?: LlmUsage;
      modelId?: string;
    }
  | { type: "error"; error: string };

export type LlmFinishReason =
  | "stop"
  | "length"
  | "tool-calls"
  | "content-filter"
  | "error"
  | "other";

export interface LlmUsage {
  promptTokens?: number;
  completionTokens?: number;
}
