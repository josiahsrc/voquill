import {
  buildDefaultPostProcessPrompt,
  postProcessTranscriptionWithGroq,
  transcribeAudioWithGroq,
} from "@repo/voice-ai";
import { invoke } from "@tauri-apps/api/core";
import { CPU_DEVICE_VALUE, DEFAULT_MODEL_SIZE } from "../types/ai.types";
import type { GpuInfo } from "../types/gpu.types";
import { buildDeviceLabel } from "../types/gpu.types";
import { getAppState } from "../store";
import {
  getPostProcessingPreferenceFromState,
  getTranscriptionPreferenceFromState,
} from "./user.utils";
import { buildWaveFile, ensureFloat32Array } from "./audio.utils";

export class TranscriptionError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "TranscriptionError";
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export type TranscriptionAudioInput = {
  samples: number[] | Float32Array | null | undefined;
  sampleRate: number | null | undefined;
};

type TranscriptionDeviceSelection = {
  cpu?: boolean;
  deviceId?: number;
  deviceName?: string;
};

export type TranscriptionOptionsPayload = {
  modelSize: string;
  device?: TranscriptionDeviceSelection;
  deviceLabel: string;
  initialPrompt: string | null;
};

export type TranscriptionMetadata = {
  modelSize?: string | null;
  inferenceDevice?: string | null;
  rawTranscript?: string | null;
  transcriptionPrompt?: string | null;
  postProcessPrompt?: string | null;
  transcriptionApiKeyId?: string | null;
  postProcessApiKeyId?: string | null;
  transcriptionMode?: "local" | "api" | null;
  postProcessMode?: "local" | "api" | null;
  postProcessDevice?: string | null;
};

export type TranscriptionResult = {
  transcript: string;
  rawTranscript: string;
  warnings: string[];
  metadata: TranscriptionMetadata;
};

const normalizeSamples = (
  samples: number[] | Float32Array | null | undefined,
): number[] =>
  Array.isArray(samples) ? samples : Array.from(samples ?? []);

const sanitizeGlossaryValue = (value: string): string =>
  value.replace(/\0/g, "").replace(/\s+/g, " ").trim();

type ReplacementRule = {
  source: string;
  destination: string;
};

type DictionaryEntries = {
  sources: string[];
  replacements: ReplacementRule[];
};

const collectDictionaryEntries = (
  state: ReturnType<typeof getAppState>,
): DictionaryEntries => {
  const sources = new Map<string, string>();
  const replacements = new Map<string, ReplacementRule>();

  const recordSource = (candidate: string): string | null => {
    const sanitized = sanitizeGlossaryValue(candidate);
    if (!sanitized) {
      return null;
    }

    const key = sanitized.toLowerCase();
    if (!sources.has(key)) {
      sources.set(key, sanitized);
    }

    return sources.get(key) ?? sanitized;
  };

  const recordReplacement = (source: string, destination: string) => {
    const sanitizedSource = recordSource(source);
    const sanitizedDestination = sanitizeGlossaryValue(destination);

    if (!sanitizedSource || !sanitizedDestination) {
      return;
    }

    const key = `${sanitizedSource.toLowerCase()}→${sanitizedDestination.toLowerCase()}`;
    if (!replacements.has(key)) {
      replacements.set(key, {
        source: sanitizedSource,
        destination: sanitizedDestination,
      });
    }
  };

  for (const termId of state.dictionary.termIds) {
    const term = state.termById[termId];
    if (!term || term.isDeleted) {
      continue;
    }

    if (term.isReplacement) {
      recordReplacement(term.sourceValue, term.destinationValue);
    } else {
      recordSource(term.sourceValue);
    }
  }

  return {
    sources: Array.from(sources.values()),
    replacements: Array.from(replacements.values()),
  };
};

const buildGlossaryPromptFromEntries = (
  entries: DictionaryEntries,
): string | null => {
  if (entries.sources.length === 0) {
    return null;
  }

  return `Vocab: ${entries.sources.join(", ")}`;
};

const buildDictionaryPostProcessingInstructions = (
  entries: DictionaryEntries,
): string | null => {
  const sections: string[] = [];

  if (entries.sources.length > 0) {
    sections.push(
      `Dictionary terms to preserve exactly as written: ${entries.sources.join(", ")}`,
    );
  }

  if (entries.replacements.length > 0) {
    const formattedRules = entries.replacements
      .map(({ source, destination }) => `- ${source} -> ${destination}`)
      .join("\n");

    sections.push(
      [
        "Apply these replacement rules exactly before returning the transcript:",
        formattedRules,
        "Every occurrence of the source phrase must appear in the final transcript as the destination value.",
      ].join("\n"),
    );
  }

  if (sections.length === 0) {
    return null;
  }

  sections.push("Do not mention these rules; simply return the cleaned transcript.");

  return `Dictionary context for editing:\n${sections.join("\n\n")}`;
};

const buildPostProcessingPrompt = (
  transcript: string,
  entries: DictionaryEntries,
): string => {
  const base = buildDefaultPostProcessPrompt(transcript);
  const dictionaryContext = buildDictionaryPostProcessingInstructions(entries);

  if (!dictionaryContext) {
    return base;
  }

  return `${dictionaryContext}\n\n${base}`;
};

let cachedDiscreteGpus: GpuInfo[] | null = null;
let loadingDiscreteGpus: Promise<GpuInfo[]> | null = null;

const filterDiscreteGpus = (gpu: GpuInfo) =>
  gpu.backend === "Vulkan" && gpu.deviceType === "DiscreteGpu";

const loadDiscreteGpus = async (): Promise<GpuInfo[]> => {
  if (cachedDiscreteGpus) {
    return cachedDiscreteGpus;
  }

  if (!loadingDiscreteGpus) {
    loadingDiscreteGpus = invoke<GpuInfo[]>("list_gpus")
      .then((gpuList) => {
        const discrete = gpuList.filter(filterDiscreteGpus);
        cachedDiscreteGpus = discrete;
        return discrete;
      })
      .catch((error) => {
        console.error("Failed to load GPU descriptors", error);
        cachedDiscreteGpus = [];
        return [];
      })
      .finally(() => {
        loadingDiscreteGpus = null;
      });
  }

  return loadingDiscreteGpus;
};

export const resolveTranscriptionOptions =
  async (): Promise<TranscriptionOptionsPayload> => {
    const state = getAppState();
    const { device, modelSize } = state.settings.aiTranscription;
    const dictionaryEntries = collectDictionaryEntries(state);
    const initialPrompt = buildGlossaryPromptFromEntries(dictionaryEntries);

    const normalizedModelSize =
      modelSize?.trim().toLowerCase() || DEFAULT_MODEL_SIZE;

    const options: TranscriptionOptionsPayload = {
      modelSize: normalizedModelSize,
      deviceLabel: "CPU",
      initialPrompt,
    };

    const ensureCpu = () => {
      options.device = { cpu: true };
      options.deviceLabel = "CPU";
      return options;
    };

    if (!device || device === CPU_DEVICE_VALUE) {
      return ensureCpu();
    }

    const match = /^gpu-(\d+)$/.exec(device);
    if (!match) {
      return ensureCpu();
    }

    const index = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(index)) {
      return ensureCpu();
    }

    const gpus = await loadDiscreteGpus();
    const selected = gpus[index];

    if (!selected) {
      return ensureCpu();
    }

    options.device = {
      cpu: false,
      deviceId: selected.device,
      deviceName: selected.name,
    };
    options.deviceLabel = `GPU · ${buildDeviceLabel(selected)}`;

    return options;
  };

export const transcribeAndPostProcessAudio = async ({
  samples,
  sampleRate,
}: TranscriptionAudioInput): Promise<TranscriptionResult> => {
  if (sampleRate == null || Number.isNaN(sampleRate)) {
    throw new TranscriptionError(
      "Recording missing sample rate. Please try again.",
    );
  }

  if (sampleRate <= 0) {
    throw new TranscriptionError("Recording sample rate is invalid.");
  }

  const normalizedSamples = normalizeSamples(samples);
  if (normalizedSamples.length === 0) {
    throw new TranscriptionError("Recording contains no audio samples.");
  }

  const state = getAppState();
  const transcriptionSettings = state.settings.aiTranscription;
  const transcriptionPreference = getTranscriptionPreferenceFromState(state);
  const shouldUseApiTranscription = transcriptionSettings.mode === "api";
  const dictionaryEntries = collectDictionaryEntries(state);
  const glossaryPrompt = buildGlossaryPromptFromEntries(dictionaryEntries);

  let transcript: string;

  const metadata: TranscriptionMetadata = {
    modelSize: null,
    inferenceDevice: null,
    transcriptionPrompt: glossaryPrompt ?? null,
    transcriptionMode: shouldUseApiTranscription ? "api" : "local",
    transcriptionApiKeyId:
      shouldUseApiTranscription &&
      transcriptionPreference &&
      transcriptionPreference.mode === "api"
        ? transcriptionPreference.apiKeyId ?? null
        : null,
  };

  if (shouldUseApiTranscription) {
    if (
      !transcriptionPreference ||
      transcriptionPreference.mode !== "api" ||
      !transcriptionPreference.apiKeyId
    ) {
      throw new TranscriptionError(
        "API transcription requires a configured key.",
      );
    }

    const apiKeyRecord = state.apiKeyById[transcriptionPreference.apiKeyId];
    if (!apiKeyRecord) {
      throw new TranscriptionError("API transcription key not found.");
    }

    if (apiKeyRecord.provider !== "groq") {
      throw new TranscriptionError("Unsupported transcription provider.");
    }

    const apiKeyValue = apiKeyRecord.keyFull?.trim();
    if (!apiKeyValue) {
      throw new TranscriptionError(
        "Groq transcription requires a valid API key.",
      );
    }

    try {
      const floatSamples = ensureFloat32Array(normalizedSamples);
      const wavBuffer = buildWaveFile(floatSamples, sampleRate);
      transcript = await transcribeAudioWithGroq({
        apiKey: apiKeyValue,
        audio: wavBuffer,
        ext: "wav",
        prompt: glossaryPrompt ?? undefined,
      });
      metadata.modelSize = null;
      metadata.inferenceDevice = "API · Groq";
      metadata.transcriptionPrompt = glossaryPrompt ?? null;
      metadata.transcriptionApiKeyId = transcriptionPreference.apiKeyId ?? null;
    } catch (error) {
      console.error("Failed to transcribe audio with Groq", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to transcribe audio with Groq. Please try again.";
      throw new TranscriptionError(message, error);
    }
  } else {
    metadata.transcriptionMode = "local";
    metadata.transcriptionApiKeyId = null;
    try {
      const options = await resolveTranscriptionOptions();
      transcript = await invoke<string>("transcribe_audio", {
        samples: normalizedSamples,
        sampleRate,
        options: {
          modelSize: options.modelSize,
          device: options.device,
          initialPrompt: options.initialPrompt ?? undefined,
        },
      });
      metadata.modelSize = options.modelSize;
      metadata.inferenceDevice = options.deviceLabel;
      metadata.transcriptionPrompt =
        options.initialPrompt ?? glossaryPrompt ?? null;
    } catch (error) {
      console.error("Failed to transcribe audio", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to transcribe audio. Please try again.";
      throw new TranscriptionError(message, error);
    }
  }

  const normalizedTranscript = transcript.trim();
  if (!normalizedTranscript) {
    throw new TranscriptionError("Transcription produced no text.");
  }
  metadata.rawTranscript = normalizedTranscript;

  const warnings: string[] = [];
  const postProcessingSettings = state.settings.aiPostProcessing;
  const postProcessingPreference = getPostProcessingPreferenceFromState(state);
  const shouldUseApiPostProcessing = postProcessingSettings.mode === "api";
  metadata.postProcessMode = shouldUseApiPostProcessing ? "api" : "local";
  metadata.postProcessApiKeyId =
    shouldUseApiPostProcessing &&
    postProcessingPreference &&
    postProcessingPreference.mode === "api"
      ? postProcessingPreference.apiKeyId ?? null
      : null;
  metadata.postProcessDevice = shouldUseApiPostProcessing
    ? "API · Groq"
    : "Disabled";

  let groqPostProcessingKey: string | null = null;

  if (shouldUseApiPostProcessing) {
    if (
      !postProcessingPreference ||
      postProcessingPreference.mode !== "api" ||
      !postProcessingPreference.apiKeyId
    ) {
      warnings.push("API post-processing requires a configured key.");
      metadata.postProcessDevice = "API · Groq (missing key)";
    } else {
      const postKeyRecord =
        state.apiKeyById[postProcessingPreference.apiKeyId];
      if (!postKeyRecord) {
        warnings.push("API post-processing key not found.");
        metadata.postProcessDevice = "API · Groq (missing key)";
      } else if (postKeyRecord.provider !== "groq") {
        warnings.push("Unsupported post-processing provider.");
        metadata.postProcessDevice = "API · Groq (unsupported provider)";
      } else {
        const postKeyValue = postKeyRecord.keyFull?.trim();
        if (!postKeyValue) {
          warnings.push("Groq post-processing requires a valid API key.");
          metadata.postProcessDevice = "API · Groq (invalid key)";
        } else {
          groqPostProcessingKey = postKeyValue;
        }
      }
    }
  }

  let finalTranscript = normalizedTranscript;

  if (groqPostProcessingKey) {
    try {
      const postProcessingPrompt = buildPostProcessingPrompt(
        normalizedTranscript,
        dictionaryEntries,
      );
      metadata.postProcessPrompt = postProcessingPrompt;

      const processed = await postProcessTranscriptionWithGroq({
        apiKey: groqPostProcessingKey,
        transcript: normalizedTranscript,
        prompt: postProcessingPrompt,
      });
      const trimmedProcessed = processed.trim();
      if (trimmedProcessed) {
        finalTranscript = trimmedProcessed;
      } else {
        warnings.push(
          "Post-processing returned no text. Using original transcript.",
        );
      }
    } catch (error) {
      console.error("Failed to post-process transcription with Groq", error);
      warnings.push("Post-processing failed. Using original transcript.");
    }
  }

  return {
    transcript: finalTranscript,
    rawTranscript: metadata.rawTranscript ?? normalizedTranscript,
    warnings,
    metadata,
  };
};
