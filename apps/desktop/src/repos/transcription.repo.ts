import { invoke } from "@tauri-apps/api/core";
import { Transcription, TranscriptionAudioSnapshot } from "@repo/types";
import { BaseRepo } from "./base.repo";
import { firemix } from "@firemix/client";
import { getMyUserId } from "../utils/user.utils";
import { getAppState } from "../store";

type LocalTranscriptionAudio = TranscriptionAudioSnapshot;

type LocalTranscription = {
  id: string;
  transcript: string;
  timestamp: number;
  audio?: LocalTranscriptionAudio | null;
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

export type TranscriptionAudioData = {
  samples: number[];
  sampleRate: number;
};

export type ListTranscriptionsParams = {
  limit?: number;
  offset?: number;
};

const toLocalTranscription = (
  transcription: Transcription
): LocalTranscription => ({
  id: transcription.id,
  transcript: transcription.transcript,
  timestamp: transcription.createdAt.toMillis(),
  audio: transcription.audio
    ? {
        filePath: transcription.audio.filePath,
        durationMs: transcription.audio.durationMs,
      }
    : undefined,
  modelSize: transcription.modelSize ?? null,
  inferenceDevice: transcription.inferenceDevice ?? null,
  rawTranscript: transcription.rawTranscript ?? null,
  transcriptionPrompt: transcription.transcriptionPrompt ?? null,
  postProcessPrompt: transcription.postProcessPrompt ?? null,
  transcriptionApiKeyId: transcription.transcriptionApiKeyId ?? null,
  postProcessApiKeyId: transcription.postProcessApiKeyId ?? null,
  transcriptionMode: transcription.transcriptionMode ?? null,
  postProcessMode: transcription.postProcessMode ?? null,
  postProcessDevice: transcription.postProcessDevice ?? null,
});

const fromLocalTranscription = (
  transcription: LocalTranscription
): Transcription => ({
  id: transcription.id,
  transcript: transcription.transcript,
  createdAt: firemix().timestampFromMillis(transcription.timestamp),
  createdByUserId: getMyUserId(getAppState()),
  isDeleted: false,
  audio: transcription.audio
    ? {
        filePath: transcription.audio.filePath,
        durationMs: transcription.audio.durationMs,
      }
    : undefined,
  modelSize: transcription.modelSize ?? undefined,
  inferenceDevice: transcription.inferenceDevice ?? undefined,
  rawTranscript: transcription.rawTranscript ?? undefined,
  transcriptionPrompt: transcription.transcriptionPrompt ?? undefined,
  postProcessPrompt: transcription.postProcessPrompt ?? undefined,
  transcriptionApiKeyId: transcription.transcriptionApiKeyId ?? undefined,
  postProcessApiKeyId: transcription.postProcessApiKeyId ?? undefined,
  transcriptionMode: transcription.transcriptionMode ?? undefined,
  postProcessMode: transcription.postProcessMode ?? undefined,
  postProcessDevice: transcription.postProcessDevice ?? undefined,
});

export abstract class BaseTranscriptionRepo extends BaseRepo {
  abstract createTranscription(transcription: Transcription): Promise<Transcription>;
  abstract listTranscriptions(params?: ListTranscriptionsParams): Promise<Transcription[]>;
  abstract deleteTranscription(id: string): Promise<void>;
  abstract updateTranscription(transcription: Transcription): Promise<Transcription>;
  abstract loadTranscriptionAudio(id: string): Promise<TranscriptionAudioData>;
  abstract purgeStaleAudio(): Promise<string[]>;
}

export class LocalTranscriptionRepo extends BaseTranscriptionRepo {
  async createTranscription(
    transcription: Transcription
  ): Promise<Transcription> {
    const stored = await invoke<LocalTranscription>("transcription_create", {
      transcription: toLocalTranscription(transcription),
    });

    return fromLocalTranscription(stored);
  }

  async listTranscriptions(
    params: ListTranscriptionsParams = {}
  ): Promise<Transcription[]> {
    const limit = Math.max(0, Math.trunc(params.limit ?? 20));
    const offset = Math.max(0, Math.trunc(params.offset ?? 0));

    const transcriptions = await invoke<LocalTranscription[]>(
      "transcription_list",
      { limit, offset }
    );

    return transcriptions.map(fromLocalTranscription);
  }

  async deleteTranscription(id: string): Promise<void> {
    await invoke<void>("transcription_delete", { id });
  }

  async updateTranscription(transcription: Transcription): Promise<Transcription> {
    const stored = await invoke<LocalTranscription>("transcription_update", {
      transcription: toLocalTranscription(transcription),
    });
    return fromLocalTranscription(stored);
  }

  async loadTranscriptionAudio(id: string): Promise<TranscriptionAudioData> {
    return invoke<TranscriptionAudioData>("transcription_audio_load", { id });
  }

  async purgeStaleAudio(): Promise<string[]> {
    const purged = await invoke<string[] | undefined>(
      "purge_stale_transcription_audio"
    );
    return Array.isArray(purged) ? purged : [];
  }
}
