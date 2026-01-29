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
}

export class OllamaLlmApi extends BaseLlmApi {
  private client: OpenAI;

  constructor(opts: { url: string; apiKey: string }) {
    super();
    this.client = new OpenAI({
      baseURL: `${opts.url}/v1`,
      apiKey: opts.apiKey,
    });
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
}
