import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { listEnabledLlmProvidersWithKeys } from "../repo/llm-provider.repo";
import { listEnabledSttProvidersWithKeys } from "../repo/stt-provider.repo";
import { requireAuth } from "../utils/auth.utils";
import { ClientError } from "../utils/error.utils";
import { createLlmApi } from "../utils/llm-provider.utils";
import { createTranscriptionApi } from "../utils/stt-provider.utils";

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

let llmIndex = 0;
let sttIndex = 0;

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

  const providers = await listEnabledSttProvidersWithKeys();
  if (providers.length === 0) {
    throw new Error("No enabled STT providers configured");
  }

  const provider = providers[sttIndex % providers.length];
  sttIndex++;

  const transcription = createTranscriptionApi(provider);
  const result = await transcription.transcribe({
    audioBuffer: blob,
    mimeType: input.audioMimeType,
    prompt: input.prompt,
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

  const providers = await listEnabledLlmProvidersWithKeys();
  if (providers.length === 0) {
    throw new Error("No enabled LLM providers configured");
  }

  const provider = providers[llmIndex % providers.length];
  llmIndex++;

  const llmApi = createLlmApi(provider);
  const result = await llmApi.generateText({
    system: input.system ?? undefined,
    prompt: input.prompt,
    model: provider.model,
    jsonResponse: input.jsonResponse ?? undefined,
  });

  return { text: result.text };
}
