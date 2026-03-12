import type { JSONSchema } from "./json-schema.types";

export interface OpenAiChatFunctionTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: JSONSchema;
    strict?: boolean;
  };
}

export interface OpenAiChatToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAiChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: OpenAiChatToolCall[];
}

export interface OpenAiChatRequest {
  model?: string;
  messages: OpenAiChatMessage[];
  stream: boolean;
  tools?: OpenAiChatFunctionTool[];
  tool_choice?:
    | "auto"
    | "none"
    | "required"
    | {
        type: "function";
        function: {
          name: string;
        };
      };
  max_tokens?: number;
  temperature?: number;
  stop?: string[];
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
}

export interface OpenAiChatChoice {
  index: number;
  finish_reason: string | null;
  message?: {
    role?: "assistant";
    content?: string | null;
    tool_calls?: OpenAiChatToolCall[];
  };
  delta?: {
    role?: "assistant";
    content?: string | null;
    tool_calls?: Array<{
      index?: number;
      id?: string;
      type?: "function";
      function?: {
        name?: string;
        arguments?: string;
      };
    }>;
  };
}

export interface OpenAiChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface OpenAiChatCompletion {
  id?: string;
  model?: string;
  created?: number;
  choices: OpenAiChatChoice[];
  usage?: OpenAiChatUsage;
}
