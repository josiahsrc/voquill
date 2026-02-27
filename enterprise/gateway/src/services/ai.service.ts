import type { CloudModel, HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { retry } from "@repo/utilities";
import { listActiveLlmProvidersWithKeys } from "../repo/llm-provider.repo";
import { insertMetric } from "../repo/metrics.repo";
import { listActiveSttProvidersWithKeys } from "../repo/stt-provider.repo";
import type { LlmProviderRow } from "../types/llm-provider.types";
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

const CLOUD_MODEL_MIN_TIER: Record<CloudModel, number> = {
  low: 1,
  medium: 2,
  large: 3,
};

export function selectLlmProvider(
  providers: LlmProviderRow[],
  model: CloudModel,
  index: number,
): LlmProviderRow {
  const minTier = CLOUD_MODEL_MIN_TIER[model];
  const eligible = providers.filter((p) => p.tier >= minTier);

  if (eligible.length === 0) {
    throw new Error(
      `No LLM providers configured for tier >= ${minTier} (model: ${model})`,
    );
  }

  const lowestTier = eligible[0].tier;
  const group = eligible.filter((p) => p.tier === lowestTier);
  return group[index % group.length];
}

export async function transcribeAudio(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"ai/transcribeAudio">;
}): Promise<HandlerOutput<"ai/transcribeAudio">> {
  const auth = requireAuth(opts.auth);
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
    const text = "Simulated response";
    insertMetric({
      userId: auth.userId,
      operation: "transcribe",
      providerName: "simulated",
      status: "success",
      latencyMs: 100,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    }).catch(() => {});
    return { text };
  }

  const providers = await listActiveSttProvidersWithKeys();
  if (providers.length === 0) {
    throw new Error("No active STT providers configured");
  }

  const provider = providers[sttIndex % providers.length];
  sttIndex++;

  const startTime = Date.now();
  const transcription = createTranscriptionApi(provider);
  try {
    const result = await retry({
      retries: 3,
      fn: async () =>
        transcription.transcribe({
          audioBuffer: blob,
          mimeType: input.audioMimeType,
          prompt: input.prompt,
          language: input.language,
        }),
    });

    const wordCount = result.text.split(/\s+/).filter(Boolean).length;
    insertMetric({
      userId: auth.userId,
      operation: "transcribe",
      providerName: provider.name,
      status: "success",
      latencyMs: Date.now() - startTime,
      wordCount,
    }).catch(() => {});

    return { text: result.text };
  } catch (error) {
    insertMetric({
      userId: auth.userId,
      operation: "transcribe",
      providerName: provider.name,
      status: "error",
      latencyMs: Date.now() - startTime,
      wordCount: 0,
    }).catch(() => {});
    throw error;
  }
}

export async function generateText(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"ai/generateText">;
}): Promise<HandlerOutput<"ai/generateText">> {
  const auth = requireAuth(opts.auth);
  const { input } = opts;

  if (input.simulate) {
    const text = "Simulated generated text.";
    insertMetric({
      userId: auth.userId,
      operation: "generate",
      providerName: "simulated",
      status: "success",
      latencyMs: 100,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    }).catch(() => {});
    return { text };
  }

  const allProviders = await listActiveLlmProvidersWithKeys();
  const model: CloudModel = input.model ?? "medium";
  const provider = selectLlmProvider(allProviders, model, llmIndex);
  llmIndex++;

  const startTime = Date.now();
  const llmApi = createLlmApi(provider);
  try {
    const result = await retry({
      retries: 3,
      fn: async () =>
        llmApi.generateText({
          system: input.system ?? undefined,
          prompt: input.prompt,
          model: provider.model,
          jsonResponse: input.jsonResponse ?? undefined,
        }),
    });

    const wordCount = result.text.split(/\s+/).filter(Boolean).length;
    insertMetric({
      userId: auth.userId,
      operation: "generate",
      providerName: provider.name,
      status: "success",
      latencyMs: Date.now() - startTime,
      wordCount,
    }).catch(() => {});

    return { text: result.text };
  } catch (error) {
    insertMetric({
      userId: auth.userId,
      operation: "generate",
      providerName: provider.name,
      status: "error",
      latencyMs: Date.now() - startTime,
      wordCount: 0,
    }).catch(() => {});
    throw error;
  }
}
