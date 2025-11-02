import { FiremixTimestamp } from "@firemix/core";

export type Transcription = {
  id: string;
  createdAt: FiremixTimestamp;
  createdByUserId: string;
  transcript: string;
  isDeleted: boolean;
  audio?: TranscriptionAudioSnapshot;
  modelSize?: string | null;
  inferenceDevice?: string | null;
  rawTranscript?: string | null;
  transcriptionPrompt?: string | null;
  postProcessPrompt?: string | null;
  transcriptionApiKeyId?: string | null;
  postProcessApiKeyId?: string | null;
  transcriptionMode?: "local" | "api" | "cloud" | null;
  postProcessMode?: "none" | "api" | "cloud" | null;
  postProcessDevice?: string | null;
};

export type TranscriptionAudioSnapshot = {
  filePath: string;
  durationMs: number;
};
