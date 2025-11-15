import { invokeHandler } from "@repo/functions";
import { Nullable } from "@repo/types";
import { groqTranscribeAudio, TranscriptionModel } from "@repo/voice-ai";
import { invoke } from "@tauri-apps/api/core";
import { getAppState } from "../store";
import { CPU_DEVICE_VALUE, DEFAULT_MODEL_SIZE, TranscriptionMode } from "../types/ai.types";
import { AudioSamples } from "../types/audio.types";
import { buildDeviceLabel } from "../types/gpu.types";
import { buildWaveFile, ensureFloat32Array, normalizeSamples } from "../utils/audio.utils";
import { loadDiscreteGpus } from "../utils/gpu.utils";
import { BaseRepo } from "./base.repo";

type TranscriptionDeviceSelection = {
  cpu?: boolean;
  deviceId?: number;
  deviceName?: string;
};

type TranscriptionOptionsPayload = {
  modelSize: string;
  device?: TranscriptionDeviceSelection;
  deviceLabel: string;
};

export type TranscribeAudioMetadata = {
  inferenceDevice?: Nullable<string>;
  modelSize?: Nullable<string>;
  transcriptionMode?: Nullable<TranscriptionMode>;
}

export type TranscribeAudioInput = {
  samples: AudioSamples;
  sampleRate: number;
  prompt?: Nullable<string>;
  language?: string;
};

export type TranscribeAudioOutput = {
  text: string;
  metadata?: Nullable<TranscribeAudioMetadata>;
};

export abstract class BaseTranscribeAudioRepo extends BaseRepo {
  abstract transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput>;
}

export class LocalTranscribeAudioRepo extends BaseTranscribeAudioRepo {
  private async resolveTranscriptionOptions(): Promise<TranscriptionOptionsPayload> {
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

  async transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
    const normalized = normalizeSamples(input.samples);
    const options = await this.resolveTranscriptionOptions();
    const transcript = await invoke<string>("transcribe_audio", {
      samples: normalized,
      sampleRate: input.sampleRate,
      options: {
        modelSize: options.modelSize,
        device: options.device,
        initialPrompt: input.prompt,
      },
    });

    return {
      text: transcript,
      metadata: {
        inferenceDevice: options.deviceLabel,
        modelSize: options.modelSize,
        transcriptionMode: "local",
      }
    };
  }
}

export class CloudTranscribeAudioRepo extends BaseTranscribeAudioRepo {
  async transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
    const normalized = normalizeSamples(input.samples);
    const floatSamples = ensureFloat32Array(normalized);
    const wavBuffer = buildWaveFile(floatSamples, input.sampleRate);
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(wavBuffer)));

    const response = await invokeHandler("ai/transcribeAudio", {
      prompt: input.prompt,
      audioBase64,
      audioMimeType: "audio/wav",
      language: input.language,
    });

    return {
      text: response.text,
      metadata: {
        transcriptionMode: "cloud",
      }
    };
  }
}

export class GroqTranscribeAudioRepo extends BaseTranscribeAudioRepo {
  private groqApiKey: string;

  constructor(apiKey: string) {
    super();
    this.groqApiKey = apiKey;
  }

  async transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
    const normalized = normalizeSamples(input.samples);
    const floatSamples = ensureFloat32Array(normalized);
    const wavBuffer = buildWaveFile(floatSamples, input.sampleRate);
    const model: TranscriptionModel = "whisper-large-v3-turbo";

    const { text: transcript } = await groqTranscribeAudio({
      apiKey: this.groqApiKey,
      model,
      blob: wavBuffer,
      ext: "wav",
      prompt: input.prompt ?? undefined,
      language: input.language,
    });

    return {
      text: transcript,
      metadata: {
        inferenceDevice: "API • Groq",
        modelSize: model,
        transcriptionMode: "api",
      }
    };
  }
}
