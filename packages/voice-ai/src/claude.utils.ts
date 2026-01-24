import Anthropic from "@anthropic-ai/sdk";
import { retry } from "@repo/utilities/src/async";
import { countWords } from "@repo/utilities/src/string";
import type { JsonResponse } from "@repo/types";

export const CLAUDE_MODELS = [
  "claude-opus-4-5-20251101",
  "claude-opus-4-5",
  "claude-3-7-sonnet-latest",
  "claude-3-7-sonnet-20250219",
  "claude-3-5-haiku-latest",
  "claude-3-5-haiku-20241022",
  "claude-haiku-4-5",
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-0",
  "claude-4-sonnet-20250514",
  "claude-sonnet-4-5",
  "claude-sonnet-4-5-20250929",
  "claude-opus-4-0",
  "claude-opus-4-20250514",
  "claude-4-opus-20250514",
  "claude-opus-4-1-20250805",
  "claude-3-opus-latest",
  "claude-3-opus-20240229",
  "claude-3-haiku-20240307",
] as const;
export type ClaudeModel = (typeof CLAUDE_MODELS)[number];

const createClient = (apiKey: string) => {
  return new Anthropic({
    apiKey: apiKey.trim(),
    dangerouslyAllowBrowser: true,
  });
};

export type ClaudeGenerateTextArgs = {
  apiKey: string;
  model?: ClaudeModel;
  system?: string;
  prompt: string;
  jsonResponse?: JsonResponse;
};

export type ClaudeGenerateResponseOutput = {
  text: string;
  tokensUsed: number;
};

export const claudeGenerateTextResponse = async ({
  apiKey,
  model = "claude-sonnet-4-20250514",
  system,
  prompt,
  jsonResponse,
}: ClaudeGenerateTextArgs): Promise<ClaudeGenerateResponseOutput> => {
  return retry({
    retries: 3,
    fn: async () => {
      const client = createClient(apiKey);

      let finalPrompt = prompt;
      if (jsonResponse) {
        finalPrompt = `${prompt}\n\nRespond with valid JSON matching this schema: ${JSON.stringify(jsonResponse.schema)}`;
      }

      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: system ?? undefined,
        messages: [{ role: "user", content: finalPrompt }],
      });

      console.log("claude llm usage:", response.usage);

      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text response from Claude");
      }

      const content = textBlock.text;
      const tokensUsed =
        (response.usage?.input_tokens ?? 0) +
        (response.usage?.output_tokens ?? 0);

      return {
        text: content,
        tokensUsed: tokensUsed || countWords(content),
      };
    },
  });
};

export type ClaudeTestIntegrationArgs = {
  apiKey: string;
};

export const claudeTestIntegration = async ({
  apiKey,
}: ClaudeTestIntegrationArgs): Promise<boolean> => {
  const client = createClient(apiKey);

  const response = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 32,
    messages: [
      {
        role: "user",
        content: 'Reply with the single word "Hello."',
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textBlock.text.toLowerCase().includes("hello");
};
