import OpenAI from "openai";
import {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { retry, countWords } from "@voquill/utilities";
import type { JsonResponse, LlmChatInput, LlmStreamEvent } from "@voquill/types";
import { openaiCompatibleStreamChat } from "./openai.utils";

export const CEREBRAS_MODELS = [
  "zai-glm-4.7",
  "llama3.1-8b",
  "gpt-oss-120b",
  "qwen-3-235b-a22b-instruct-2507",
] as const;
export type CerebrasModel = (typeof CEREBRAS_MODELS)[number];

const CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1";

const contentToString = (
  content: string | ChatCompletionContentPart[] | null | undefined,
): string => {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  return content
    .map((part) => {
      if (part.type === "text") {
        return part.text ?? "";
      }
      return "";
    })
    .join("")
    .trim();
};

const createClient = (apiKey: string) => {
  return new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: CEREBRAS_BASE_URL,
    dangerouslyAllowBrowser: true,
  });
};

export type CerebrasGenerateTextArgs = {
  apiKey: string;
  model?: CerebrasModel;
  system?: string;
  prompt: string;
  jsonResponse?: JsonResponse;
};

export type CerebrasGenerateResponseOutput = {
  text: string;
  tokensUsed: number;
};

export const cerebrasGenerateTextResponse = async ({
  apiKey,
  model = "zai-glm-4.7",
  system,
  prompt,
  jsonResponse,
}: CerebrasGenerateTextArgs): Promise<CerebrasGenerateResponseOutput> => {
  return retry({
    retries: 3,
    fn: async () => {
      const client = createClient(apiKey);

      const messages: ChatCompletionMessageParam[] = [];
      if (system) {
        messages.push({ role: "system", content: system });
      }

      let finalPrompt = prompt;
      if (jsonResponse) {
        finalPrompt = `${prompt}\n\nRespond with valid JSON matching this schema: ${JSON.stringify(jsonResponse.schema)}`;
      }

      const userParts: ChatCompletionContentPart[] = [];
      userParts.push({ type: "text", text: finalPrompt });
      messages.push({ role: "user", content: userParts });

      const params: Record<string, unknown> = {
        messages,
        model,
        temperature: 1,
        max_tokens: 1024,
        top_p: 1,
        response_format: jsonResponse ? { type: "json_object" } : undefined,
      };
      if (model === "zai-glm-4.7") {
        params.reasoning_effort = "none";
      }

      const response = await client.chat.completions.create(
        params as unknown as OpenAI.ChatCompletionCreateParamsNonStreaming,
      );

      console.log("cerebras llm usage:", response.usage);
      if (!response.choices || response.choices.length === 0) {
        throw new Error("No response from Cerebras");
      }

      const result = response.choices[0].message.content;
      if (!result) {
        throw new Error("Content is empty");
      }

      const content = contentToString(result);
      return {
        text: content,
        tokensUsed: response.usage?.total_tokens ?? countWords(content),
      };
    },
  });
};

export type CerebrasTestIntegrationArgs = {
  apiKey: string;
};

export const cerebrasTestIntegration = async ({
  apiKey,
}: CerebrasTestIntegrationArgs): Promise<boolean> => {
  const client = createClient(apiKey);

  const response = await client.chat.completions.create({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Reply with the single word "Hello."`,
          },
        ],
      },
    ],
    model: "llama3.1-8b",
    temperature: 0,
    max_tokens: 32,
    top_p: 1,
  });

  if (!response.choices || response.choices.length === 0) {
    throw new Error("No response from Cerebras");
  }

  const first = response.choices[0];
  const content = contentToString(first?.message?.content);
  if (!content) {
    throw new Error("Response content is empty");
  }

  return content.toLowerCase().includes("hello");
};

// ============================================================================
// Streaming Chat
// ============================================================================

export type CerebrasStreamChatArgs = {
  apiKey: string;
  model: string;
  input: LlmChatInput;
};

export async function* cerebrasStreamChat({
  apiKey,
  model,
  input,
}: CerebrasStreamChatArgs): AsyncGenerator<LlmStreamEvent> {
  const client = createClient(apiKey);
  yield* openaiCompatibleStreamChat(
    client,
    model,
    input,
    model === "zai-glm-4.7" ? { reasoning_effort: "none" } : undefined,
  );
}
