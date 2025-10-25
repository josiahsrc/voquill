import { FiremixTimestamp } from "@firemix/core";

export type Transcription = {
  id: string;
  createdAt: FiremixTimestamp;
  createdByUserId: string;
  transcript: string;
  isDeleted: boolean;
  audio?: TranscriptionAudioSnapshot;
};

export type TranscriptionAudioSnapshot = {
  filePath: string;
  durationMs: number;
};
