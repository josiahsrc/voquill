import { GoogleGenAI, Type } from "@google/genai";
import { retry } from "@repo/utilities/src/async";
import { countWords } from "@repo/utilities/src/string";
import type { JsonResponse } from "@repo/types";

export const GEMINI_GENERATE_TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
  "gemini-2.5-flash-lite",
] as const;
export type GeminiGenerateTextModel =
  (typeof GEMINI_GENERATE_TEXT_MODELS)[number];

export const GEMINI_TRANSCRIPTION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3-flash-preview",
] as const;
export type GeminiTranscriptionModel =
  (typeof GEMINI_TRANSCRIPTION_MODELS)[number];

const createClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

const convertJsonSchemaToGeminiSchema = (
  schema: Record<string, unknown>,
): Record<string, unknown> => {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const converted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === "type" && typeof value === "string") {
      const typeMap: Record<string, unknown> = {
        string: Type.STRING,
        number: Type.NUMBER,
        integer: Type.INTEGER,
        boolean: Type.BOOLEAN,
        array: Type.ARRAY,
        object: Type.OBJECT,
      };
      converted[key] = typeMap[value] ?? value;
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      converted[key] = convertJsonSchemaToGeminiSchema(
        value as Record<string, unknown>,
      );
    } else if (Array.isArray(value)) {
      converted[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? convertJsonSchemaToGeminiSchema(item as Record<string, unknown>)
          : item,
      );
    } else {
      converted[key] = value;
    }
  }

  return converted;
};

export type GeminiTranscriptionArgs = {
  apiKey: string;
  model?: GeminiTranscriptionModel;
  blob: ArrayBuffer | Buffer;
  mimeType?: string;
  prompt?: string;
  language?: string;
};

export type GeminiTranscribeAudioOutput = {
  text: string;
  wordsUsed: number;
};

export const geminiTranscribeAudio = async ({
  apiKey,
  model = "gemini-2.5-flash",
  blob,
  mimeType = "audio/wav",
  prompt,
  language,
}: GeminiTranscriptionArgs): Promise<GeminiTranscribeAudioOutput> => {
  return retry({
    retries: 3,
    fn: async () => {
      const client = createClient(apiKey);

      const bytes = new Uint8Array(blob);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!);
      }
      const base64Audio = btoa(binary);

      let transcriptionPrompt = "Transcribe this audio accurately.";
      if (language) {
        transcriptionPrompt += ` The audio is in ${language}.`;
      }
      if (prompt) {
        transcriptionPrompt += ` Context: ${prompt}`;
      }

      const response = await client.models.generateContent({
        model,
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
          { text: transcriptionPrompt },
        ],
      });

      const text = response.text ?? "";
      if (!text) {
        throw new Error("Transcription failed - empty response");
      }

      return { text, wordsUsed: countWords(text) };
    },
  });
};

export type GeminiGenerateTextArgs = {
  apiKey: string;
  model?: GeminiGenerateTextModel;
  system?: string;
  prompt: string;
  jsonResponse?: JsonResponse;
};

export type GeminiGenerateResponseOutput = {
  text: string;
  tokensUsed: number;
};

export const geminiGenerateTextResponse = async ({
  apiKey,
  model = "gemini-2.5-flash",
  system,
  prompt,
  jsonResponse,
}: GeminiGenerateTextArgs): Promise<GeminiGenerateResponseOutput> => {
  return retry({
    retries: 3,
    fn: async () => {
      const client = createClient(apiKey);

      let fullPrompt = prompt;
      if (system) {
        fullPrompt = `${system}\n\n${prompt}`;
      }

      const config: Record<string, unknown> = {};
      if (jsonResponse) {
        config.responseMimeType = "application/json";
        if (jsonResponse.schema) {
          config.responseSchema = convertJsonSchemaToGeminiSchema(
            jsonResponse.schema as Record<string, unknown>,
          );
        }
      }

      const response = await client.models.generateContent({
        model,
        contents: fullPrompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const text = response.text ?? "";
      if (!text) {
        throw new Error("No response from Gemini");
      }

      const usageMetadata = response.usageMetadata;
      const tokensUsed =
        (usageMetadata?.totalTokenCount as number) ?? countWords(text);

      console.log("gemini llm usage:", usageMetadata);

      return {
        text,
        tokensUsed,
      };
    },
  });
};

export type GeminiTestIntegrationArgs = {
  apiKey: string;
};

export const geminiTestIntegration = async ({
  apiKey,
}: GeminiTestIntegrationArgs): Promise<boolean> => {
  const client = createClient(apiKey);

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: 'Reply with the single word "Hello."',
  });

  const text = response.text ?? "";
  if (!text) {
    throw new Error("Response content is empty");
  }

  return text.toLowerCase().includes("hello");
};
