import { invoke } from "@tauri-apps/api/core";
import { Transcription } from "@repo/types";
import { BaseRepo } from "./base.repo";
import { firemix } from "@firemix/client";
import { getMyUserId } from "../utils/user.utils";
import { getAppState } from "../store";

type LocalTranscription = {
  id: string;
  transcript: string;
  timestamp: number;
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
});

const fromLocalTranscription = (
  transcription: LocalTranscription
): Transcription => ({
  id: transcription.id,
  transcript: transcription.transcript,
  createdAt: firemix().timestampFromMillis(transcription.timestamp),
  createdByUserId: getMyUserId(getAppState()),
  isDeleted: false,
});

export abstract class BaseTranscriptionRepo extends BaseRepo {
  abstract createTranscription(transcription: Transcription): Promise<Transcription>;
  abstract listTranscriptions(params?: ListTranscriptionsParams): Promise<Transcription[]>;
  abstract deleteTranscription(id: string): Promise<void>;
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
}
