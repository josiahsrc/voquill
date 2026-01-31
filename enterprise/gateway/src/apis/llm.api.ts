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

export class OllamaLlmApi extends BaseLlmApi {
  private client: OpenAI;
  private baseURL: string;
  private model: string;

  constructor(opts: { url: string; apiKey: string; model: string }) {
    super();
    const url = `${opts.url}/v1`;
    this.client = new OpenAI({
      baseURL: url,
      apiKey: opts.apiKey || "ollama",
    });
    this.baseURL = url;
    this.model = opts.model;
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResponse> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (input.system) {
      messages.push({ role: "system", content: input.system });
    }
    messages.push({ role: "user", content: input.prompt });

    const result = await this.client.chat.completions.create({
      model: input.model,
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
    try {
      const res = await fetch(`${this.baseURL}/api/pull`, {
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
