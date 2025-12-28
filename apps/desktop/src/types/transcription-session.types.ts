import { TranscriptionMetadata } from "../actions/transcribe.actions";

export type StopRecordingResponse = {
  samples: number[] | Float32Array;
  sampleRate?: number;
};

export type TranscriptionSessionResult = {
  transcript: string | null;
  rawTranscript: string | null;
  metadata: TranscriptionMetadata;
  warnings: string[];
};

export interface TranscriptionSession {
  onRecordingStart(sampleRate: number): Promise<void>;
  finalize(audio: StopRecordingResponse): Promise<TranscriptionSessionResult>;
  cleanup(): void;
}
