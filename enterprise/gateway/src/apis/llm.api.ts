import type { JsonResponse } from "@repo/types";
import OpenAI from "openai";

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

  async pullModel(): Promise<PullModelResponse> {
    return { done: true };
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
