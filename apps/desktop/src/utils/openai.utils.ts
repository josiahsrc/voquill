import type {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
  ChatCompletionContentPart,
} from "@repo/voice-ai";
import type {
  AiSdkGenerateResult,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3Usage,
  LanguageModelV3Prompt,
  LanguageModelV3FunctionTool,
  LanguageModelV3ProviderTool,
  LanguageModelV3ToolChoice,
} from "../agent/types";

export function convertMessagesToOpenAI(
  prompt: LanguageModelV3Prompt,
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  for (const message of prompt) {
    switch (message.role) {
      case "system":
        messages.push({
          role: "system",
          content: message.content,
        });
        break;

      case "user":
        messages.push({
          role: "user",
          content: convertUserContent(message.content),
        });
        break;

      case "assistant": {
        const textParts: string[] = [];
        const toolCalls: Array<{
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }> = [];

        for (const part of message.content) {
          if (part.type === "text") {
            textParts.push(part.text);
          } else if (part.type === "tool-call") {
            toolCalls.push({
              id: part.toolCallId,
              type: "function",
              function: {
                name: part.toolName,
                arguments:
                  typeof part.input === "string"
                    ? part.input
                    : JSON.stringify(part.input),
              },
            });
          }
        }

        const assistantMessage: ChatCompletionMessageParam = {
          role: "assistant",
          content: textParts.length > 0 ? textParts.join("") : null,
        };

        if (toolCalls.length > 0) {
          (assistantMessage as { tool_calls?: typeof toolCalls }).tool_calls =
            toolCalls;
        }

        messages.push(assistantMessage);
        break;
      }

      case "tool":
        for (const part of message.content) {
          if (part.type === "tool-result") {
            let contentStr: string;
            if (part.output.type === "text") {
              contentStr = part.output.value;
            } else if (part.output.type === "json") {
              contentStr = JSON.stringify(part.output.value);
            } else {
              contentStr = "";
            }

            messages.push({
              role: "tool",
              tool_call_id: part.toolCallId,
              content: contentStr,
            });
          }
        }
        break;
    }
  }

  return messages;
}

function convertUserContent(
  content: Array<{
    type: string;
    text?: string;
    data?: unknown;
    mediaType?: string;
  }>,
): string | ChatCompletionContentPart[] {
  const hasOnlyText = content.every((part) => part.type === "text");
  if (hasOnlyText && content.length === 1 && content[0].type === "text") {
    return content[0].text ?? "";
  }

  const parts: ChatCompletionContentPart[] = [];

  for (const part of content) {
    if (part.type === "text") {
      parts.push({
        type: "text",
        text: part.text ?? "",
      });
    } else if (part.type === "file" && part.mediaType?.startsWith("image/")) {
      const data = part.data;
      if (typeof data === "string") {
        const isUrl =
          data.startsWith("http://") || data.startsWith("https://");
        parts.push({
          type: "image_url",
          image_url: {
            url: isUrl ? data : `data:${part.mediaType};base64,${data}`,
          },
        });
      }
    }
  }

  return parts.length > 0 ? parts : "";
}

export function convertToolsToOpenAI(
  tools:
    | Array<LanguageModelV3FunctionTool | LanguageModelV3ProviderTool>
    | undefined,
): ChatCompletionTool[] | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  return tools
    .filter(
      (tool): tool is LanguageModelV3FunctionTool => tool.type === "function",
    )
    .map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema as Record<string, unknown>,
        strict: tool.strict,
      },
    }));
}

export function convertToolChoiceToOpenAI(
  toolChoice: LanguageModelV3ToolChoice | undefined,
): ChatCompletionToolChoiceOption | undefined {
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
      type: "function",
      function: {
        name: toolChoice.toolName,
      },
    };
  }

  return undefined;
}

export function convertResponseToAiSdk(
  response: ChatCompletion,
): AiSdkGenerateResult {
  const choice = response.choices[0];
  if (!choice) {
    throw new Error("No choices in OpenAI response");
  }

  const content = convertContentToAiSdk(choice.message);
  const finishReason = convertFinishReasonToAiSdk(choice.finish_reason);
  const usage = convertUsageToAiSdk(response.usage);

  return {
    content,
    finishReason,
    usage,
    warnings: [],
    response: {
      id: response.id,
      timestamp: new Date(response.created * 1000),
      modelId: response.model,
    },
  };
}

function convertContentToAiSdk(
  message: ChatCompletion["choices"][0]["message"],
): LanguageModelV3Content[] {
  const content: LanguageModelV3Content[] = [];

  if (message.content) {
    content.push({
      type: "text",
      text: message.content,
    });
  }

  if (message.tool_calls && message.tool_calls.length > 0) {
    for (const toolCall of message.tool_calls) {
      content.push({
        type: "tool-call",
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        input: toolCall.function.arguments,
      });
    }
  }

  return content;
}

type OpenAIFinishReason =
  | "stop"
  | "length"
  | "tool_calls"
  | "content_filter"
  | "function_call";

function convertFinishReasonToAiSdk(
  finishReason: OpenAIFinishReason,
): LanguageModelV3FinishReason {
  const reasonMap: Record<
    string,
    "stop" | "length" | "tool-calls" | "content-filter" | "error" | "other"
  > = {
    stop: "stop",
    length: "length",
    tool_calls: "tool-calls",
    content_filter: "content-filter",
    function_call: "tool-calls",
  };

  const unified = reasonMap[finishReason] ?? "other";

  return {
    unified,
    raw: finishReason,
  };
}

type OpenAIUsage =
  | {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      prompt_tokens_details?: {
        cached_tokens?: number;
      };
      completion_tokens_details?: {
        reasoning_tokens?: number;
      };
    }
  | undefined;

function convertUsageToAiSdk(usage: OpenAIUsage): LanguageModelV3Usage {
  return {
    inputTokens: {
      total: usage?.prompt_tokens,
      noCache: undefined,
      cacheRead: usage?.prompt_tokens_details?.cached_tokens,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: usage?.completion_tokens,
      text: undefined,
      reasoning: usage?.completion_tokens_details?.reasoning_tokens,
    },
  };
}
