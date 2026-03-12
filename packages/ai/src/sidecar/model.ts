import type { MastraLanguageModel } from "@mastra/core/agent";
import { randomUUID } from "node:crypto";
import type {
  OpenAiChatCompletion,
  OpenAiChatMessage,
  OpenAiChatRequest,
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
      const request = serializeLlmChatRequest(options, true);
      const chunks = ipc.requestStream<OpenAiChatCompletion>("llm/chat", {
        request,
      });

      const stream = new ReadableStream<SidecarStreamPart>({
        start(controller) {
          void pumpOpenAiStream(chunks, controller);
        },
      });

      return {
        stream,
        request: {
          body: request,
        },
      };
    },
  };
}

function serializeLlmChatRequest(
  options: SidecarCallOptions,
  stream: boolean,
): OpenAiChatRequest {
  return {
    model: MODEL_ID,
    messages: serializePrompt(options),
    stream,
    tools: options.tools
      ?.filter((tool) => tool.type === "function")
      .map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          strict: tool.strict,
        },
      })),
    tool_choice: serializeToolChoice(options.toolChoice),
    max_tokens: options.maxOutputTokens,
    temperature: options.temperature,
    stop: options.stopSequences,
    top_p: options.topP,
    frequency_penalty: options.frequencyPenalty,
    presence_penalty: options.presencePenalty,
    seed: options.seed,
  };
}

function serializePrompt(options: SidecarCallOptions): OpenAiChatMessage[] {
  const messages: OpenAiChatMessage[] = [];

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
          type: "function" as const,
          function: {
            name: part.toolName,
            arguments: JSON.stringify(part.input ?? {}),
          },
        }));

      messages.push({
        role: "assistant",
        content: textParts.length > 0 ? textParts.join("\n") : null,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      });
      continue;
    }

    for (const part of message.content) {
      if (part.type !== "tool-result") {
        continue;
      }

      messages.push({
        role: "tool",
        tool_call_id: part.toolCallId,
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

function serializeToolChoice(toolChoice?: PromptToolChoice) {
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
    return {
      type: "function" as const,
      function: {
        name: toolChoice.toolName,
      },
    };
  }
}

async function pumpOpenAiStream(
  chunks: AsyncIterable<OpenAiChatCompletion>,
  controller: ReadableStreamDefaultController<SidecarStreamPart>,
) {
  const textId = randomUUID();
  const toolCalls = new Map<
    number,
    {
      id: string;
      name: string;
      input: string;
    }
  >();

  let startedText = false;
  let sentMetadata = false;
  let usage: SidecarUsage = toUsage(undefined);
  let finishReason = toFinishReason(undefined);

  controller.enqueue({
    type: "stream-start",
    warnings: [],
  });

  try {
    for await (const chunk of chunks) {
      if (!sentMetadata && (chunk.id || chunk.model || chunk.created)) {
        controller.enqueue({
          type: "response-metadata",
          id: chunk.id,
          modelId: chunk.model,
          timestamp: chunk.created
            ? new Date(chunk.created * 1_000)
            : undefined,
        });
        sentMetadata = true;
      }

      if (chunk.usage) {
        usage = toUsage(chunk.usage);
      }

      const choice = chunk.choices[0];
      if (!choice) {
        continue;
      }

      const textDelta = choice.delta?.content;
      if (textDelta) {
        if (!startedText) {
          controller.enqueue({
            type: "text-start",
            id: textId,
          });
          startedText = true;
        }

        controller.enqueue({
          type: "text-delta",
          id: textId,
          delta: textDelta,
        });
      }

      for (const toolCallDelta of choice.delta?.tool_calls || []) {
        const index = toolCallDelta.index ?? toolCalls.size;
        const current = toolCalls.get(index) || {
          id: toolCallDelta.id || randomUUID(),
          name: toolCallDelta.function?.name || `tool-${index}`,
          input: "",
        };

        if (toolCallDelta.id) {
          current.id = toolCallDelta.id;
        }

        if (toolCallDelta.function?.name) {
          current.name = toolCallDelta.function.name;
        }

        if (toolCallDelta.function?.arguments) {
          current.input += toolCallDelta.function.arguments;
        }

        toolCalls.set(index, current);
      }

      if (choice.finish_reason) {
        finishReason = toFinishReason(choice.finish_reason);
      }
    }

    if (startedText) {
      controller.enqueue({
        type: "text-end",
        id: textId,
      });
    }

    for (const [, toolCall] of [...toolCalls.entries()].sort(
      ([leftIndex], [rightIndex]) => leftIndex - rightIndex,
    )) {
      controller.enqueue({
        type: "tool-call",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        input: toolCall.input,
      });
    }

    controller.enqueue({
      type: "finish",
      finishReason,
      usage,
    });
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
    case "content_filter":
      return { unified: "content-filter", raw };
    case "tool_calls":
      return { unified: "tool-calls", raw };
    case "error":
      return { unified: "error", raw };
    default:
      return { unified: "other", raw: raw || undefined };
  }
}

function toUsage(usage: OpenAiChatCompletion["usage"]): SidecarUsage {
  return {
    inputTokens: {
      total: usage?.prompt_tokens,
      noCache: undefined,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: usage?.completion_tokens,
      text: usage?.completion_tokens,
      reasoning: undefined,
    },
    raw: usage
      ? {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
        }
      : undefined,
  };
}
