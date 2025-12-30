import { invokeHandler } from "@repo/functions";
import { Nullable } from "@repo/types";
import { batchAsync } from "@repo/utilities";
import {
  aldeaTranscribeAudio,
  groqTranscribeAudio,
  openaiTranscribeAudio,
  OpenAITranscriptionModel,
  TranscriptionModel,
} from "@repo/voice-ai";
import { invoke } from "@tauri-apps/api/core";
import { getAppState } from "../store";
import {
  CPU_DEVICE_VALUE,
  DEFAULT_MODEL_SIZE,
  TranscriptionMode,
} from "../types/ai.types";
import { AudioSamples } from "../types/audio.types";
import { buildDeviceLabel } from "../types/gpu.types";
import {
  buildWaveFile,
  ensureFloat32Array,
  normalizeSamples,
} from "../utils/audio.utils";
import { loadDiscreteGpus } from "../utils/gpu.utils";
import {
  mergeTranscriptions,
  splitAudioTranscription,
} from "../utils/transcribe.utils";
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
};

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

export type TranscribeSegmentInput = {
  samples: Float32Array;
  sampleRate: number;
  prompt?: Nullable<string>;
  language?: string;
};

export abstract class BaseTranscribeAudioRepo extends BaseRepo {
  /**
   * Maximum duration in seconds for a single audio segment.
   * Override in child classes based on provider limits.
   */
  protected abstract getSegmentDurationSec(): number;

  /**
   * Overlap duration in seconds between consecutive segments.
   * Helps ensure transcription continuity at segment boundaries.
   */
  protected abstract getOverlapDurationSec(): number;

  /**
   * Number of concurrent transcription requests to run.
   * API providers may allow more parallelism, local inference typically 1.
   */
  protected abstract getBatchChunkCount(): number;

  /**
   * Internal method to transcribe a single audio segment.
   * Implemented by child classes with provider-specific logic.
   */
  protected abstract transcribeSegment(
    input: TranscribeSegmentInput,
  ): Promise<TranscribeAudioOutput>;

  /**
   * Transcribes audio, automatically splitting long audio into segments
   * and merging the results.
   */
  async transcribeAudio(
    input: TranscribeAudioInput,
  ): Promise<TranscribeAudioOutput> {
    const normalizedSamples = normalizeSamples(input.samples);
    const floatSamples = ensureFloat32Array(normalizedSamples);

    if (floatSamples.length === 0) {
      return { text: "", metadata: null };
    }

    const segmentDurationSec = this.getSegmentDurationSec();
    const segmentSampleCount = Math.floor(input.sampleRate * segmentDurationSec);

    // If audio fits in a single segment, transcribe directly
    if (floatSamples.length <= segmentSampleCount) {
      return this.transcribeSegment({
        samples: floatSamples,
        sampleRate: input.sampleRate,
        prompt: input.prompt,
        language: input.language,
      });
    }

    // Split into overlapping segments
    const segments = splitAudioTranscription({
      sampleRate: input.sampleRate,
      samples: floatSamples,
      segmentDurationSec,
      overlapDurationSec: this.getOverlapDurationSec(),
    });

    // Create promise factories for batched execution
    const transcriptionTasks = segments.map(
      (segmentSamples) => () =>
        this.transcribeSegment({
          samples: segmentSamples,
          sampleRate: input.sampleRate,
          prompt: input.prompt,
          language: input.language,
        }),
    );

    // Execute in batches
    const results = await batchAsync(
      this.getBatchChunkCount(),
      transcriptionTasks,
    );

    // Merge transcription texts
    const transcriptionTexts = results.map((r) => r.text);
    const mergedText = mergeTranscriptions(transcriptionTexts);

    // Use metadata from first result (all segments use same provider/device)
    const metadata = results[0]?.metadata ?? null;

    return {
      text: mergedText,
      metadata,
    };
  }
}

export class LocalTranscribeAudioRepo extends BaseTranscribeAudioRepo {
  // Local whisper can handle longer segments, but 120s is a safe default
  protected getSegmentDurationSec(): number {
    return 120;
  }

  protected getOverlapDurationSec(): number {
    return 5;
  }

  // Local inference is single-threaded, process one at a time
  protected getBatchChunkCount(): number {
    return 1;
  }

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
  }

  protected async transcribeSegment(
    input: TranscribeSegmentInput,
  ): Promise<TranscribeAudioOutput> {
    const options = await this.resolveTranscriptionOptions();
    const transcript = await invoke<string>("transcribe_audio", {
      samples: Array.from(input.samples),
      sampleRate: input.sampleRate,
      options: {
        modelSize: options.modelSize,
        device: options.device,
        initialPrompt: input.prompt,
        language: input.language,
      },
    });

    return {
      text: transcript,
      metadata: {
        inferenceDevice: options.deviceLabel,
        modelSize: options.modelSize,
        transcriptionMode: "local",
      },
    };
  }
}

export class CloudTranscribeAudioRepo extends BaseTranscribeAudioRepo {
  // Cloud uses Groq under the hood, 60s segments are safe
  protected getSegmentDurationSec(): number {
    return 60;
  }

  protected getOverlapDurationSec(): number {
    return 5;
  }

  // Allow some parallelism for cloud requests
  protected getBatchChunkCount(): number {
    return 3;
  }

  protected async transcribeSegment(
    input: TranscribeSegmentInput,
  ): Promise<TranscribeAudioOutput> {
    const wavBuffer = buildWaveFile(input.samples, input.sampleRate);

    const bytes = new Uint8Array(wavBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }

    const audioBase64 = btoa(binary);
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
      },
    };
  }
}

export class GroqTranscribeAudioRepo extends BaseTranscribeAudioRepo {
  private groqApiKey: string;
  private model: TranscriptionModel;

  constructor(apiKey: string, model: string | null) {
    super();
    this.groqApiKey = apiKey;
    this.model = (model as TranscriptionModel) ?? "whisper-large-v3-turbo";
  }

  // Groq has 25MB limit, 60s segments are well within that
  protected getSegmentDurationSec(): number {
    return 60;
  }

  protected getOverlapDurationSec(): number {
    return 5;
  }

  // Groq can handle parallel requests
  protected getBatchChunkCount(): number {
    return 3;
  }

  protected async transcribeSegment(
    input: TranscribeSegmentInput,
  ): Promise<TranscribeAudioOutput> {
    const wavBuffer = buildWaveFile(input.samples, input.sampleRate);

    const { text: transcript } = await groqTranscribeAudio({
      apiKey: this.groqApiKey,
      model: this.model,
      blob: wavBuffer,
      ext: "wav",
      prompt: input.prompt ?? undefined,
      language: input.language,
    });

    return {
      text: transcript,
      metadata: {
        inferenceDevice: "API • Groq",
        modelSize: this.model,
        transcriptionMode: "api",
      },
    };
  }
}

export class OpenAITranscribeAudioRepo extends BaseTranscribeAudioRepo {
  private openaiApiKey: string;
  private model: OpenAITranscriptionModel;

  constructor(apiKey: string, model: string | null) {
    super();
    this.openaiApiKey = apiKey;
    this.model = (model as OpenAITranscriptionModel) ?? "whisper-1";
  }

  // OpenAI has 25MB limit, 60s segments are well within that
  protected getSegmentDurationSec(): number {
    return 60;
  }

  protected getOverlapDurationSec(): number {
    return 5;
  }

  // OpenAI can handle parallel requests
  protected getBatchChunkCount(): number {
    return 3;
  }

  protected async transcribeSegment(
    input: TranscribeSegmentInput,
  ): Promise<TranscribeAudioOutput> {
    const wavBuffer = buildWaveFile(input.samples, input.sampleRate);

    const { text: transcript } = await openaiTranscribeAudio({
      apiKey: this.openaiApiKey,
      model: this.model,
      blob: wavBuffer,
      ext: "wav",
      prompt: input.prompt ?? undefined,
      language: input.language,
    });

    return {
      text: transcript,
      metadata: {
        inferenceDevice: "API • OpenAI",
        modelSize: this.model,
        transcriptionMode: "api",
      },
    };
  }
}

export class AldeaTranscribeAudioRepo extends BaseTranscribeAudioRepo {
  private aldeaApiKey: string;

  constructor(apiKey: string) {
    super();
    this.aldeaApiKey = apiKey;
  }

  // Conservative segment duration for Aldea
  protected getSegmentDurationSec(): number {
    return 60;
  }

  protected getOverlapDurationSec(): number {
    return 5;
  }

  // Allow some parallelism for API requests
  protected getBatchChunkCount(): number {
    return 3;
  }

  protected async transcribeSegment(
    input: TranscribeSegmentInput,
  ): Promise<TranscribeAudioOutput> {
    const wavBuffer = buildWaveFile(input.samples, input.sampleRate);

    const { text: transcript } = await aldeaTranscribeAudio({
      apiKey: this.aldeaApiKey,
      blob: wavBuffer,
      ext: "wav",
      language: input.language,
    });

    return {
      text: transcript,
      metadata: {
        inferenceDevice: "API • Aldea",
        modelSize: null,
        transcriptionMode: "api",
      },
    };
  }
}
