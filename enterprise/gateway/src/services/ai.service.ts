import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import OpenAI, { toFile } from "openai";
import { requireAuth } from "../utils/auth.utils";
import { getLlmModel, getLlmServerUrls, getSttModel, getSttServerUrls } from "../utils/env.utils";
import { ClientError } from "../utils/error.utils";

const MAX_BLOB_BYTES = 16 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/flac": "flac",
};

let sttIndex = 0;
let llmIndex = 0;

function getNextLlmClient(): OpenAI {
  const urls = getLlmServerUrls();
  if (urls.length === 0) {
    throw new Error("No LLM_SERVER_URL_N environment variables configured");
  }
  const url = urls[llmIndex % urls.length];
  llmIndex++;
  return new OpenAI({ baseURL: `${url}/v1`, apiKey: "-" });
}

function getNextSttClient(): OpenAI {
  const urls = getSttServerUrls();
  if (urls.length === 0) {
    throw new Error("No STT_SERVER_URL_N environment variables configured");
  }
  const url = urls[sttIndex % urls.length];
  sttIndex++;
  return new OpenAI({ baseURL: url, apiKey: "-" });
}

export async function transcribeAudio(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"ai/transcribeAudio">;
}): Promise<HandlerOutput<"ai/transcribeAudio">> {
  requireAuth(opts.auth);
  const { input } = opts;

  const blob = Buffer.from(input.audioBase64, "base64");
  if (blob.length === 0) {
    throw new ClientError("Audio data is empty");
  }
  if (blob.length > MAX_BLOB_BYTES) {
    throw new ClientError("Audio data exceeds maximum size of 16 MB");
  }

  const ext = MIME_TO_EXT[input.audioMimeType];
  if (!ext) {
    throw new ClientError(
      `Unsupported audio MIME type: ${input.audioMimeType}`,
    );
  }

  if (input.simulate) {
    return { text: "Simulated response" };
  }

  const client = getNextSttClient();
  const file = await toFile(blob, `audio.${ext}`, {
    type: input.audioMimeType,
  });
  const result = await client.audio.transcriptions.create({
    file,
    model: getSttModel(),
    prompt: input.prompt ?? undefined,
    language: input.language,
  });

  return { text: result.text };
}

export async function generateText(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"ai/generateText">;
}): Promise<HandlerOutput<"ai/generateText">> {
  requireAuth(opts.auth);
  const { input } = opts;

  if (input.simulate) {
    return { text: "Simulated generated text." };
  }

  const client = getNextLlmClient();
  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (input.system) {
    messages.push({ role: "system", content: input.system });
  }
  messages.push({ role: "user", content: input.prompt });

  const result = await client.chat.completions.create({
    model: getLlmModel(),
    messages,
    ...(input.jsonResponse ? { response_format: { type: "json_object" } } : {}),
  });

  return { text: result.choices[0]?.message?.content ?? "" };
}
