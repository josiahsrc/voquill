import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { transcribeAudio } from "../actions/transcribe.actions";
import { getAppState } from "../store";
import {
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";
import {
  getTranscriptionSidecarDeviceId,
  isGpuPreferredTranscriptionDevice,
  normalizeLocalWhisperModel,
} from "../utils/local-transcription.utils";
import {
  LocalSidecarStreamingSession,
  getLocalTranscriptionSidecarManager,
} from "../utils/local-transcription-sidecar.utils";
import { getLogger } from "../utils/log.utils";
import {
  buildLocalizedTranscriptionPrompt,
  collectDictionaryEntries,
} from "../utils/prompt.utils";
import { mapDictationLanguageToWhisperLanguage } from "../utils/language.utils";
import { loadMyEffectiveDictationLanguage } from "../utils/user.utils";

type AudioChunkPayload = {
  samples: number[];
};

type LocalSessionContext = {
  prompt: string;
};

export class LocalTranscriptionSession implements TranscriptionSession {
  private unlisten: UnlistenFn | null = null;
  private session: LocalSidecarStreamingSession | null = null;
  private context: LocalSessionContext | null = null;
  private startupWarnings: string[] = [];

  async onRecordingStart(sampleRate: number): Promise<void> {
    this.cleanup();
    this.startupWarnings = [];

    try {
      const state = getAppState();
      const dictationLanguage = await loadMyEffectiveDictationLanguage(state);
      const whisperLanguage =
        mapDictationLanguageToWhisperLanguage(dictationLanguage);
      const prompt = buildLocalizedTranscriptionPrompt({
        entries: collectDictionaryEntries(state),
        dictationLanguage,
        state,
      });

      const settings = state.settings.aiTranscription;
      const sidecarSession =
        await getLocalTranscriptionSidecarManager().createStreamingSession({
          model: normalizeLocalWhisperModel(settings.modelSize),
          preferGpu: isGpuPreferredTranscriptionDevice(settings.device),
          sampleRate,
          language: whisperLanguage,
          initialPrompt: prompt || undefined,
          deviceId: getTranscriptionSidecarDeviceId(settings.device),
        });

      this.session = sidecarSession;
      this.context = { prompt };
      this.unlisten = await listen<AudioChunkPayload>(
        "audio_chunk",
        (event) => {
          if (!this.session || !event.payload.samples.length) {
            return;
          }
          this.session.writeAudioChunk(event.payload.samples);
        },
      );
    } catch (error) {
      const message = this.toErrorMessage(error);
      this.startupWarnings.push(
        `Local streaming session unavailable, falling back to batch mode (${message})`,
      );
      getLogger().warning(
        `[local-stream-session] start failed, falling back (${message})`,
      );
      this.cleanup();
    }
  }

  async finalize(
    audio: StopRecordingResponse,
  ): Promise<TranscriptionSessionResult> {
    const warnings = [...this.startupWarnings];

    if (!this.session) {
      return await this.finalizeWithBatchFallback(audio, warnings);
    }

    try {
      const output = await this.session.finalize();
      return {
        rawTranscript: output.text.trim() || null,
        metadata: {
          modelSize: output.model,
          inferenceDevice: output.inferenceDevice,
          transcriptionMode: "local",
          transcriptionPrompt: this.context?.prompt ?? null,
          transcriptionDurationMs: Math.round(output.durationMs),
        },
        warnings,
      };
    } catch (error) {
      const message = this.toErrorMessage(error);
      warnings.push(
        `Local streaming transcription failed, falling back to batch mode (${message})`,
      );
      getLogger().warning(
        `[local-stream-session] finalize failed, falling back (${message})`,
      );
      return await this.finalizeWithBatchFallback(audio, warnings);
    } finally {
      this.cleanup();
    }
  }

  cleanup(): void {
    this.unlisten?.();
    this.unlisten = null;
    this.session?.cleanup();
    this.session = null;
    this.context = null;
  }

  private async finalizeWithBatchFallback(
    audio: StopRecordingResponse,
    warnings: string[],
  ): Promise<TranscriptionSessionResult> {
    const payloadSamples = Array.isArray(audio.samples)
      ? audio.samples
      : Array.from(audio.samples ?? []);
    const rate = audio.sampleRate;

    if (rate == null || rate <= 0 || payloadSamples.length === 0) {
      getLogger().warning(
        `Local fallback: skipping transcription (rate=${rate}, samples=${payloadSamples.length})`,
      );
      return {
        rawTranscript: null,
        metadata: {
          transcriptionMode: "local",
          transcriptionPrompt: this.context?.prompt ?? null,
        },
        warnings,
      };
    }

    const result = await transcribeAudio({
      samples: payloadSamples,
      sampleRate: rate,
    });

    return {
      rawTranscript: result.rawTranscript,
      metadata: result.metadata,
      warnings: [...warnings, ...result.warnings],
    };
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
