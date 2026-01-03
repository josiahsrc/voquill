import type { JsonResponse } from "@repo/types";
import { retry } from "@repo/utilities/src/async";
import { countWords } from "@repo/utilities/src/string";
import OpenAI, { toFile } from "openai";
import {
  ChatCompletion,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
} from "openai/resources/chat/completions";

export const OPENAI_GENERATE_TEXT_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
] as const;
export type OpenAIGenerateTextModel =
  (typeof OPENAI_GENERATE_TEXT_MODELS)[number];

export const OPENAI_TRANSCRIPTION_MODELS = ["whisper-1"] as const;
export type OpenAITranscriptionModel =
  (typeof OPENAI_TRANSCRIPTION_MODELS)[number];

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

const createClient = (
  apiKey: string,
  baseUrl?: string,
  customFetch?: typeof globalThis.fetch,
) => {
  // `dangerouslyAllowBrowser` is needed because this runs on a desktop tauri app.
  // The Tauri app doesn't run in a web browser and encrypts API keys locally, so this
  // is safe.
  return new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: baseUrl,
    dangerouslyAllowBrowser: true,
    fetch: customFetch,
  });
};

export type OpenAITranscriptionArgs = {
  apiKey: string;
  model?: OpenAITranscriptionModel;
  blob: ArrayBuffer | Buffer;
  ext: string;
  prompt?: string;
  language?: string;
};

export type OpenAITranscribeAudioOutput = {
  text: string;
  wordsUsed: number;
};

export const openaiTranscribeAudio = async ({
  apiKey,
  model = "whisper-1",
  blob,
  ext,
  prompt,
  language,
}: OpenAITranscriptionArgs): Promise<OpenAITranscribeAudioOutput> => {
  return retry({
    retries: 3,
    fn: async () => {
      const client = createClient(apiKey);

      const file = await toFile(blob, `audio.${ext}`);
      const response = await client.audio.transcriptions.create({
        file,
        model,
        prompt,
        language: language ?? "en",
      });

      if (!response.text) {
        throw new Error("Transcription failed");
      }

      return { text: response.text, wordsUsed: countWords(response.text) };
    },
  });
};

export type OpenAIGenerateTextArgs = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  system?: string;
  prompt: string;
  imageUrls?: string[];
  jsonResponse?: JsonResponse;
  customFetch?: typeof globalThis.fetch;
};

export type OpenAIGenerateResponseOutput = {
  text: string;
  tokensUsed: number;
};

export const openaiGenerateTextResponse = async ({
  apiKey,
  baseUrl,
  model = "gpt-4o-mini",
  system,
  prompt,
  imageUrls = [],
  jsonResponse,
  customFetch,
}: OpenAIGenerateTextArgs): Promise<OpenAIGenerateResponseOutput> => {
  return retry({
    retries: 3,
    fn: async () => {
      const client = createClient(apiKey, baseUrl, customFetch);

      const messages: ChatCompletionMessageParam[] = [];
      if (system) {
        messages.push({ role: "system", content: system });
      }

      const userParts: ChatCompletionContentPart[] = [];
      for (const url of imageUrls) {
        userParts.push({
          type: "image_url",
          image_url: { url },
        });
      }

      userParts.push({ type: "text", text: prompt });
      messages.push({ role: "user", content: userParts });

      const response = await client.chat.completions.create({
        messages,
        model,
        temperature: 1,
        max_completion_tokens: 1024,
        top_p: 1,
        response_format: jsonResponse
          ? {
              type: "json_schema",
              json_schema: {
                name: jsonResponse.name,
                description: jsonResponse.description,
                schema: jsonResponse.schema,
                strict: true,
              },
            }
          : undefined,
      });

      console.log("openai llm usage:", response.usage);
      if (!response.choices || response.choices.length === 0) {
        throw new Error("No response from OpenAI");
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

export type OpenAITestIntegrationArgs = {
  apiKey: string;
};

export const openaiTestIntegration = async ({
  apiKey,
}: OpenAITestIntegrationArgs): Promise<boolean> => {
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
    model: "gpt-4o-mini",
    temperature: 0,
    max_completion_tokens: 32,
    top_p: 1,
  });

  if (!response.choices || response.choices.length === 0) {
    throw new Error("No response from OpenAI");
  }

  const first = response.choices[0];
  const content = contentToString(first?.message?.content);
  if (!content) {
    throw new Error("Response content is empty");
  }

  return content.toLowerCase().includes("hello");
};

export type OpenAIChatCompletionArgs = {
  apiKey: string;
  model: string;
  messages: ChatCompletionMessageParam[];
  tools?: ChatCompletionTool[];
  toolChoice?: ChatCompletionToolChoiceOption;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  responseFormat?:
    | { type: "text" }
    | {
        type: "json_schema";
        jsonSchema: {
          name?: string;
          description?: string;
          schema?: Record<string, unknown>;
        };
      };
  abortSignal?: AbortSignal;
};

export const openaiChatCompletion = async ({
  apiKey,
  model,
  messages,
  tools,
  toolChoice,
  maxTokens,
  temperature,
  topP,
  stopSequences,
  responseFormat,
  abortSignal,
}: OpenAIChatCompletionArgs): Promise<ChatCompletion> => {
  return retry({
    retries: 3,
    fn: async () => {
      const client = createClient(apiKey);

      const response = await client.chat.completions.create(
        {
          model,
          messages,
          tools: tools && tools.length > 0 ? tools : undefined,
          tool_choice: toolChoice,
          max_completion_tokens: maxTokens,
          temperature,
          top_p: topP,
          stop: stopSequences,
          response_format: responseFormat
            ? responseFormat.type === "json_schema"
              ? {
                  type: "json_schema",
                  json_schema: {
                    name: responseFormat.jsonSchema.name ?? "response",
                    description: responseFormat.jsonSchema.description,
                    schema: responseFormat.jsonSchema.schema,
                    strict: true,
                  },
                }
              : { type: "text" }
            : undefined,
        },
        {
          signal: abortSignal,
        },
      );

      console.log("openai chat completion usage:", response.usage);

      if (!response.choices || response.choices.length === 0) {
        throw new Error("No response from OpenAI");
      }

      return response;
    },
  });
};

export type {
  ChatCompletion,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
};
