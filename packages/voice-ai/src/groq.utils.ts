import Groq, { toFile } from "groq-sdk/index";
import { ChatCompletionContentPart, ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { retry } from "@repo/utilities/src/async";

export const GENERATE_TEXT_MODELS = ["meta-llama/llama-4-scout-17b-16e-instruct"] as const;
export type GenerateTextModel = (typeof GENERATE_TEXT_MODELS)[number];

export const TRANSCRIPTION_MODELS = ["whisper-large-v3-turbo"] as const;
export type TranscriptionModel = (typeof TRANSCRIPTION_MODELS)[number];

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
  // `dangerouslyAllowBrowser` is needed because this runs on a desktop tauri app.
  // The Tauri app doesn't run in a web browser and encyrpts API keys locally, so this
  // is safe.
  return new Groq({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true });
}

export type GroqTranscriptionArgs = {
  apiKey: string;
  model?: TranscriptionModel;
  blob: ArrayBuffer | Buffer,
  ext: string
  prompt?: string;
}

export const groqTranscribeAudio = async ({
  apiKey,
  model = "whisper-large-v3-turbo",
  blob,
  ext,
  prompt,
}: GroqTranscriptionArgs): Promise<string> => {
  return retry({
    retries: 3,
    fn: async () => {
      const client = createClient(apiKey);

      const file = await toFile(blob, `audio.${ext}`);
      const response = await client.audio.transcriptions.create({
        file,
        model,
        prompt,
      });

      if (!response.text) {
        throw new Error("Transcription failed");
      }

      return response.text;
    },
  });
}

export type GroqGenerateTextArgs = {
  apiKey: string;
  model?: GenerateTextModel;
  system?: string;
  prompt: string;
  imageUrls?: string[];
  jsonResponse?: {
    name: string;
    description?: string;
    schema: { [key: string]: unknown };
  };
}

export const groqGenerateTextResponse = async ({
  apiKey,
  model = "meta-llama/llama-4-scout-17b-16e-instruct",
  system,
  prompt,
  imageUrls = [],
  jsonResponse,
}: GroqGenerateTextArgs): Promise<string> => {
  return retry({
    retries: 3,
    fn: async () => {
      const client = createClient(apiKey);

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
            },
          }
          : undefined,
      });

      console.log("groq llm usage:", response.usage);
      if (!response.choices || response.choices.length === 0) {
        throw new Error("No response from Groq");
      }

      const result = response.choices[0].message.content;
      if (!result) {
        throw new Error("Content is empty");
      }

      return result.trim();
    },
  });
}

export type GroqTestIntegrationArgs = {
  apiKey: string;
}

export const groqTestIntegration = async ({
  apiKey,
}: GroqTestIntegrationArgs): Promise<boolean> => {
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
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 0,
    max_completion_tokens: 32,
    top_p: 1,
  });

  if (!response.choices || response.choices.length === 0) {
    throw new Error("No response from Groq");
  }

  const first = response.choices[0];
  const content = contentToString(first?.message?.content);
  if (!content) {
    throw new Error("Response content is empty");
  }

  return content.toLowerCase().includes("hello");
}
