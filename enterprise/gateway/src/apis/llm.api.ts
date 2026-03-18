import type {
  JsonResponse,
  LlmChatInput,
  LlmFinishReason,
  LlmMessage,
  LlmStreamEvent,
  LlmTool,
  LlmToolChoice,
} from "@repo/types";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

export type GenerateTextInput = {
  system?: string;
  prompt: string;
  model: string;
  jsonResponse?: JsonResponse;
};

export type GenerateTextResponse = {
  text: string;
};

export type PullModelResponse = {
  done: boolean;
  error?: string;
};

export abstract class BaseLlmApi {
  abstract generateText(
    input: GenerateTextInput,
  ): Promise<GenerateTextResponse>;
  abstract streamChat(input: LlmChatInput): AsyncGenerator<LlmStreamEvent>;
  abstract pullModel(): Promise<PullModelResponse>;
}

abstract class BaseOpenAILlmApi extends BaseLlmApi {
  private client: OpenAI;
  protected model: string;

  constructor(opts: { baseURL: string; apiKey: string; model: string }) {
    super();
    this.client = new OpenAI({
      baseURL: opts.baseURL,
      apiKey: opts.apiKey,
    });
    this.model = opts.model;
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResponse> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (input.system) {
      messages.push({ role: "system", content: input.system });
    }
    messages.push({ role: "user", content: input.prompt });

    const result = await this.client.chat.completions.create({
      model: this.model,
      messages,
      ...(input.jsonResponse
        ? {
            response_format: {
              type: "json_schema" as const,
              json_schema: {
                name: input.jsonResponse.name,
                description: input.jsonResponse.description,
                schema: input.jsonResponse.schema,
              },
            },
          }
        : {}),
    });

    return { text: result.choices[0]?.message?.content ?? "" };
  }

  async *streamChat(input: LlmChatInput): AsyncGenerator<LlmStreamEvent> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: llmMessagesToOpenAI(input.messages),
      stream: true,
      stream_options: { include_usage: true },
      tools: llmToolsToOpenAI(input.tools),
      tool_choice: llmToolChoiceToOpenAI(input.toolChoice),
      max_tokens: input.maxTokens,
      temperature: input.temperature,
      stop: input.stopSequences,
      top_p: input.topP,
      frequency_penalty: input.frequencyPenalty,
      presence_penalty: input.presencePenalty,
      seed: input.seed,
    });

    const toolCalls = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();
    let finishReason: LlmFinishReason = "other";
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let modelId: string | undefined;

    for await (const chunk of stream) {
      if (chunk.model) {
        modelId = chunk.model;
      }

      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens ?? undefined;
        completionTokens = chunk.usage.completion_tokens ?? undefined;
      }

      const choice = chunk.choices[0];
      if (!choice) continue;

      if (choice.delta?.content) {
        yield { type: "text-delta", text: choice.delta.content };
      }

      for (const tc of choice.delta?.tool_calls ?? []) {
        const index = tc.index ?? toolCalls.size;
        const current = toolCalls.get(index) ?? {
          id: "",
          name: "",
          arguments: "",
        };
        if (tc.id) current.id = tc.id;
        if (tc.function?.name) current.name = tc.function.name;
        if (tc.function?.arguments) current.arguments += tc.function.arguments;
        toolCalls.set(index, current);
      }

      if (choice.finish_reason) {
        finishReason = toFinishReason(choice.finish_reason);
      }
    }

    for (const [, tc] of [...toolCalls.entries()].sort(([a], [b]) => a - b)) {
      yield {
        type: "tool-call",
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
      };
    }

    yield {
      type: "finish",
      finishReason,
      usage:
        promptTokens != null || completionTokens != null
          ? { promptTokens, completionTokens }
          : undefined,
      modelId,
    };
  }

  async pullModel(): Promise<PullModelResponse> {
    return { done: true };
  }
}

function llmMessagesToOpenAI(
  messages: LlmMessage[],
): ChatCompletionMessageParam[] {
  return messages.map((msg): ChatCompletionMessageParam => {
    switch (msg.role) {
      case "system":
        return { role: "system", content: msg.content };
      case "user":
        return { role: "user", content: msg.content };
      case "assistant":
        return {
          role: "assistant",
          content: msg.content ?? null,
          tool_calls: msg.toolCalls?.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        };
      case "tool":
        return {
          role: "tool",
          tool_call_id: msg.toolCallId,
          content: msg.content,
        };
    }
  });
}

function llmToolsToOpenAI(
  tools: LlmTool[] | undefined,
): ChatCompletionTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters as Record<string, unknown> | undefined,
    },
  }));
}

function llmToolChoiceToOpenAI(
  choice: LlmToolChoice | undefined,
):
  | "auto"
  | "none"
  | "required"
  | { type: "function"; function: { name: string } }
  | undefined {
  if (!choice) return undefined;
  if (typeof choice === "string") return choice;
  return { type: "function", function: { name: choice.name } };
}

function toFinishReason(raw: string | null | undefined): LlmFinishReason {
  switch (raw) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "content-filter";
    case "tool_calls":
      return "tool-calls";
    default:
      return "other";
  }
}

export class GroqLlmApi extends BaseOpenAILlmApi {
  constructor(opts: { apiKey: string; model: string }) {
    super({ baseURL: "https://api.groq.com/openai/v1", ...opts });
  }
}

export class SyntheticAiLlmApi extends BaseOpenAILlmApi {
  constructor(opts: { apiKey: string; model: string }) {
    super({ baseURL: "https://api.synthetic.new/openai/v1", ...opts });
  }
}

export class OpenRouterLlmApi extends BaseOpenAILlmApi {
  constructor(opts: { apiKey: string; model: string }) {
    super({ baseURL: "https://openrouter.ai/api/v1", ...opts });
  }
}

export class OllamaLlmApi extends BaseOpenAILlmApi {
  private ollamaUrl: string;

  constructor(opts: { url: string; apiKey: string; model: string }) {
    const baseURL = `${opts.url}/v1`;
    super({ baseURL, apiKey: opts.apiKey || "ollama", model: opts.model });
    this.ollamaUrl = opts.url;
  }

  async pullModel(): Promise<PullModelResponse> {
    try {
      const res = await fetch(`${this.ollamaUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: this.model }),
      });
      if (res.ok) {
        return { done: true };
      }
      const text = await res.text().catch(() => res.statusText);
      return { done: false, error: text };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { done: false, error: message };
    }
  }
}
