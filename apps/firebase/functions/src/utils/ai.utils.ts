import { Groq, toFile } from "groq-sdk";
import {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "groq-sdk/resources/chat/completions";
import { getGroqApiKey } from "./env.utils";
import { countWords } from "./string.utils";

const groq = () => {
  return new Groq({
    apiKey: getGroqApiKey(),
  });
};

export const groqTranscribeAudio = async (
  blob: Buffer,
  ext: string
): Promise<string> => {
  const response = await groq().audio.transcriptions.create({
    file: await toFile(blob, `audio.${ext}`),
    model: "whisper-large-v3-turbo",
    prompt: "Vocab: Voquill, Techcyte",
  });

  console.log("groq transcription usage:", countWords(response.text));
  if (!response.text) {
    throw new Error("Transcription failed");
  }

  return response.text;
};

type GroqGenerateResponseArgs = {
  system?: string;
  prompt: string;
  imageUrls?: string[];
  jsonResponse?: {
    name: string;
    description?: string;
    schema: { [key: string]: unknown };
  };
};

const groqGenerateResponseInternal = async (
  args: GroqGenerateResponseArgs
): Promise<string> => {
  const messages: ChatCompletionMessageParam[] = [];

  if (args.system) {
    messages.push({ role: "system", content: args.system });
  }

  const userParts: ChatCompletionContentPart[] = [];
  for (const url of args.imageUrls ?? []) {
    userParts.push({
      type: "image_url",
      image_url: { url },
    });
  }

  userParts.push({ type: "text", text: args.prompt });
  messages.push({ role: "user", content: userParts });

  const response = await groq().chat.completions.create({
    messages: messages,
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 1,
    max_completion_tokens: 1024,
    top_p: 1,
    response_format: args.jsonResponse
      ? {
        type: "json_schema",
        json_schema: {
          name: args.jsonResponse.name,
          description: args.jsonResponse.description,
          schema: args.jsonResponse.schema,
        },
      }
      : undefined,
  });

  console.log("groq llm usage:", response.usage);
  if (!response.choices || response.choices.length === 0) {
    throw new Error("No response from Groq");
  }

  const result = response.choices[0]?.message.content;
  if (!result) {
    throw new Error("Content is empty");
  }

  return result.trim();
};

export const groqGenerateResponse = async (
  args: GroqGenerateResponseArgs & {
    retries?: number;
  }
): Promise<string> => {
  const retries = args.retries ?? 1;
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await groqGenerateResponseInternal(args);
      return result;
    } catch (error) {
      console.warn(`groqGenerateResponse attempt ${i + 1} failed:`, error);
    }
  }

  throw new Error("unable to generate response after retries");
};
