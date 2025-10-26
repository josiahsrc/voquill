import { postProcessTranscriptionWithGroq, transcribeAudioWithGroq } from "@repo/voice-ai";
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
};

export type TranscriptionMetadata = {
  modelSize?: string | null;
  inferenceDevice?: string | null;
};

export type TranscriptionResult = {
  transcript: string;
  warnings: string[];
  metadata: TranscriptionMetadata;
};

const normalizeSamples = (
  samples: number[] | Float32Array | null | undefined,
): number[] =>
  Array.isArray(samples) ? samples : Array.from(samples ?? []);

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

    const normalizedModelSize =
      modelSize?.trim().toLowerCase() || DEFAULT_MODEL_SIZE;

    const options: TranscriptionOptionsPayload = {
      modelSize: normalizedModelSize,
      deviceLabel: "CPU",
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

  let transcript: string;
  let metadata: TranscriptionMetadata = {
    modelSize: null,
    inferenceDevice: null,
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
      });
      metadata = {
        modelSize: null,
        inferenceDevice: "API · Groq",
      };
    } catch (error) {
      console.error("Failed to transcribe audio with Groq", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to transcribe audio with Groq. Please try again.";
      throw new TranscriptionError(message, error);
    }
  } else {
    try {
      const options = await resolveTranscriptionOptions();
      transcript = await invoke<string>("transcribe_audio", {
        samples: normalizedSamples,
        sampleRate,
        options: {
          modelSize: options.modelSize,
          device: options.device,
        },
      });
      metadata = {
        modelSize: options.modelSize,
        inferenceDevice: options.deviceLabel,
      };
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

  const warnings: string[] = [];
  const postProcessingSettings = state.settings.aiPostProcessing;
  const postProcessingPreference = getPostProcessingPreferenceFromState(state);
  const shouldUseApiPostProcessing = postProcessingSettings.mode === "api";
  let groqPostProcessingKey: string | null = null;

  if (shouldUseApiPostProcessing) {
    if (
      !postProcessingPreference ||
      postProcessingPreference.mode !== "api" ||
      !postProcessingPreference.apiKeyId
    ) {
      warnings.push("API post-processing requires a configured key.");
    } else {
      const postKeyRecord =
        state.apiKeyById[postProcessingPreference.apiKeyId];
      if (!postKeyRecord) {
        warnings.push("API post-processing key not found.");
      } else if (postKeyRecord.provider !== "groq") {
        warnings.push("Unsupported post-processing provider.");
      } else {
        const postKeyValue = postKeyRecord.keyFull?.trim();
        if (!postKeyValue) {
          warnings.push("Groq post-processing requires a valid API key.");
        } else {
          groqPostProcessingKey = postKeyValue;
        }
      }
    }
  }

  let finalTranscript = normalizedTranscript;

  if (groqPostProcessingKey) {
    try {
      const processed = await postProcessTranscriptionWithGroq({
        apiKey: groqPostProcessingKey,
        transcript: normalizedTranscript,
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
    warnings,
    metadata,
  };
};
