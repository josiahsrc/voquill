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
}
