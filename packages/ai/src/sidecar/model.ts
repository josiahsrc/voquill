import type { MastraLanguageModel } from "@mastra/core/agent";
import { randomUUID } from "node:crypto";
import type {
  LlmChatInput,
  LlmMessage,
  LlmStreamEvent,
  LlmToolChoice,
} from "@repo/types";
import { getSidecarIpcClient } from "./client";

const MODEL_ID = "default";

type SidecarLanguageModel = Extract<
  MastraLanguageModel,
  { specificationVersion: "v3" }
>;
type SidecarCallOptions = Parameters<SidecarLanguageModel["doStream"]>[0];
type SidecarGenerateResult = Awaited<
  ReturnType<SidecarLanguageModel["doGenerate"]>
>;
type SidecarStreamResult = Awaited<
  ReturnType<SidecarLanguageModel["doStream"]>
>;
type SidecarStreamPart = Awaited<
  SidecarStreamResult["stream"] extends ReadableStream<infer TPart>
    ? TPart
    : never
>;
type PromptMessage = SidecarCallOptions["prompt"][number];
type PromptTextPart = Extract<
  Extract<PromptMessage, { role: "user" | "assistant" }>["content"][number],
  { type: "text" }
>;
type PromptFilePart = Extract<
  Extract<PromptMessage, { role: "user" | "assistant" }>["content"][number],
  { type: "file" }
>;
type PromptToolCallPart = Extract<
  Extract<PromptMessage, { role: "assistant" }>["content"][number],
  { type: "tool-call" }
>;
type PromptToolResultPart = Extract<
  Extract<PromptMessage, { role: "assistant" | "tool" }>["content"][number],
  { type: "tool-result" }
>;
type PromptToolResultOutput = PromptToolResultPart["output"];
type PromptToolChoice = SidecarCallOptions["toolChoice"];
type SidecarFinishReason = Extract<
  SidecarStreamPart,
  { type: "finish" }
>["finishReason"];
type SidecarUsage = Extract<SidecarStreamPart, { type: "finish" }>["usage"];

export function createSidecarLanguageModel(): SidecarLanguageModel {
  const ipc = getSidecarIpcClient();

  return {
    specificationVersion: "v3",
    provider: "voquill-sidecar",
    modelId: MODEL_ID,
    supportedUrls: {},
    async doGenerate(
      options: SidecarCallOptions,
    ): Promise<SidecarGenerateResult> {
      return this.doStream(options);
    },
    async doStream(options: SidecarCallOptions): Promise<SidecarStreamResult> {
      const input = serializeChatInput(options);
      const chunks = ipc.requestStream<LlmStreamEvent>("llm/chat", {
        input,
      });

      const stream = new ReadableStream<SidecarStreamPart>({
        start(controller) {
          void pumpLlmStream(chunks, controller);
        },
      });

      return {
        stream,
        request: {
          body: input,
        },
      };
    },
  };
}

function serializeChatInput(options: SidecarCallOptions): LlmChatInput {
  return {
    messages: serializePrompt(options),
    tools: options.tools
      ?.filter((tool) => tool.type === "function")
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      })),
    toolChoice: serializeToolChoice(options.toolChoice),
    maxTokens: options.maxOutputTokens,
    temperature: options.temperature,
    stopSequences: options.stopSequences,
    topP: options.topP,
    frequencyPenalty: options.frequencyPenalty,
    presencePenalty: options.presencePenalty,
    seed: options.seed,
  };
}

function serializePrompt(options: SidecarCallOptions): LlmMessage[] {
  const messages: LlmMessage[] = [];

  for (const message of options.prompt) {
    if (message.role === "system") {
      messages.push({
        role: "system",
        content: message.content,
      });
      continue;
    }

    if (message.role === "user") {
      messages.push({
        role: "user",
        content: serializeTextParts(message.content),
      });
      continue;
    }

    if (message.role === "assistant") {
      const textParts = message.content
        .filter((part): part is PromptTextPart => part.type === "text")
        .map((part) => part.text);
      const toolCalls = message.content
        .filter((part): part is PromptToolCallPart => part.type === "tool-call")
        .map((part) => ({
          id: part.toolCallId,
          name: part.toolName,
          arguments: JSON.stringify(part.input ?? {}),
        }));

      messages.push({
        role: "assistant",
        content: textParts.length > 0 ? textParts.join("\n") : null,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      });
      continue;
    }

    for (const part of message.content) {
      if (part.type !== "tool-result") {
        continue;
      }

      messages.push({
        role: "tool",
        toolCallId: part.toolCallId,
        content: serializeToolOutput(part.output),
      });
    }
  }

  return messages;
}

function serializeTextParts(parts: Array<PromptTextPart | PromptFilePart>) {
  return parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }

      return `[file:${part.mediaType}${part.filename ? `:${part.filename}` : ""}]`;
    })
    .join("\n");
}

function serializeToolOutput(output: PromptToolResultOutput) {
  switch (output.type) {
    case "text":
    case "error-text":
      return output.value;
    case "json":
    case "error-json":
      return JSON.stringify(output.value);
    case "execution-denied":
      return output.reason || "Execution denied";
    case "content":
      return output.value
        .map((part) => {
          switch (part.type) {
            case "text":
              return part.text;
            case "file-data":
              return `[file:${part.mediaType}${part.filename ? `:${part.filename}` : ""}]`;
            case "file-url":
              return `[file-url:${part.url}]`;
            case "file-id":
              return `[file-id:${part.fileId}]`;
            case "image-data":
              return `[image:${part.mediaType}]`;
            case "image-url":
              return `[image-url:${part.url}]`;
            case "image-file-id":
              return `[image-file-id:${part.fileId}]`;
            case "custom":
              return JSON.stringify(part);
            default:
              return JSON.stringify(part);
          }
        })
        .join("\n");
    default:
      return JSON.stringify(output);
  }
}

function serializeToolChoice(
  toolChoice?: PromptToolChoice,
): LlmToolChoice | undefined {
  if (!toolChoice) {
    return undefined;
  }

  if (toolChoice.type === "auto") {
    return "auto";
  }

  if (toolChoice.type === "none") {
    return "none";
  }

  if (toolChoice.type === "required") {
    return "required";
  }

  if (toolChoice.type === "tool") {
    return { name: toolChoice.toolName };
  }

  return undefined;
}

async function pumpLlmStream(
  events: AsyncIterable<LlmStreamEvent>,
  controller: ReadableStreamDefaultController<SidecarStreamPart>,
) {
  const textId = randomUUID();
  let startedText = false;
  let usage: SidecarUsage = toUsage(undefined);
  let finishReason: SidecarFinishReason = toFinishReason("other");

  controller.enqueue({
    type: "stream-start",
    warnings: [],
  });

  try {
    for await (const event of events) {
      switch (event.type) {
        case "text-delta": {
          if (!startedText) {
            controller.enqueue({ type: "text-start", id: textId });
            startedText = true;
          }
          controller.enqueue({
            type: "text-delta",
            id: textId,
            delta: event.text,
          });
          break;
        }
        case "tool-call": {
          controller.enqueue({
            type: "tool-call",
            toolCallId: event.id,
            toolName: event.name,
            input: event.arguments,
          });
          break;
        }
        case "finish": {
          finishReason = toFinishReason(event.finishReason);
          usage = toUsage(event.usage);
          if (event.modelId) {
            controller.enqueue({
              type: "response-metadata",
              id: undefined,
              modelId: event.modelId,
              timestamp: undefined,
            });
          }
          break;
        }
        case "error": {
          controller.enqueue({
            type: "error",
            error: event.error,
          });
          break;
        }
      }
    }

    if (startedText) {
      controller.enqueue({ type: "text-end", id: textId });
    }

    controller.enqueue({ type: "finish", finishReason, usage });
    controller.close();
  } catch (error) {
    controller.enqueue({
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    });
    controller.close();
  }
}

function toFinishReason(raw: string | null | undefined): SidecarFinishReason {
  switch (raw) {
    case "stop":
      return { unified: "stop", raw };
    case "length":
      return { unified: "length", raw };
    case "content-filter":
      return { unified: "content-filter", raw: "content_filter" };
    case "tool-calls":
      return { unified: "tool-calls", raw: "tool_calls" };
    case "error":
      return { unified: "error", raw };
    default:
      return { unified: "other", raw: raw || undefined };
  }
}

function toUsage(
  usage: { promptTokens?: number; completionTokens?: number } | undefined,
): SidecarUsage {
  return {
    inputTokens: {
      total: usage?.promptTokens,
      noCache: undefined,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: usage?.completionTokens,
      text: usage?.completionTokens,
      reasoning: undefined,
    },
    raw: usage
      ? {
          prompt_tokens: usage.promptTokens,
          completion_tokens: usage.completionTokens,
        }
      : undefined,
  };
}
