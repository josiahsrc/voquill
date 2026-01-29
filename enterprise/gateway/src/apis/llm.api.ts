import type { JsonResponse } from "@repo/types";
import OpenAI from "openai";

export type GenerateTextInput = {
  system?: string;
  prompt: string;
  model: string;
  jsonResponse?: JsonResponse;
};

export abstract class BaseLlmApi {
  abstract generateText(input: GenerateTextInput): Promise<{ text: string }>;
  abstract pullModel(): Promise<{ done: boolean; error?: string }>;
}

export class OllamaLlmApi extends BaseLlmApi {
  private client: OpenAI;
  private baseURL: string;
  private model: string;

  constructor(opts: { url: string; apiKey: string; model: string }) {
    super();
    this.client = new OpenAI({
      baseURL: `${opts.url}/v1`,
      apiKey: opts.apiKey,
    });
    this.baseURL = opts.url;
    this.model = opts.model;
  }

  async generateText(input: GenerateTextInput): Promise<{ text: string }> {
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

  async pullModel(): Promise<{ done: boolean; error?: string }> {
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
  }
}
