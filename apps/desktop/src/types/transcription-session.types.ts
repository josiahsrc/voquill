import { TranscribeAudioMetadata } from "../actions/transcribe.actions";

export type StopRecordingResponse = {
  samples: number[] | Float32Array;
  sampleRate?: number;
};

export type TranscriptionSessionResult = {
  rawTranscript: string | null;
  metadata: TranscribeAudioMetadata;
  warnings: string[];
};

export interface TranscriptionSession {
  onRecordingStart(sampleRate: number): Promise<void>;
  finalize(audio: StopRecordingResponse): Promise<TranscriptionSessionResult>;
  cleanup(): void;
}
