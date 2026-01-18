import {
  PostProcessMetadata,
  TranscribeAudioMetadata,
} from "../actions/transcribe.actions";

export type StopRecordingResponse = {
  samples: number[] | Float32Array;
  sampleRate?: number;
};

export type DictionaryContext = {
  glossary: string[];
  replacements: { source: string; destination: string }[];
};

export type FinalizeOptions = {
  systemPrompt?: string;
  toneTemplate?: string | null;
  language?: string;
  dictionaryContext?: DictionaryContext;
};

export type TranscriptionSessionResult = {
  rawTranscript: string | null;
  transcript?: string | null;
  metadata: TranscribeAudioMetadata;
  postProcessMetadata?: PostProcessMetadata;
  warnings: string[];
};

export type RecordingStartOptions = {
  sampleRate: number;
  glossary?: string[];
  language?: string;
};

export interface TranscriptionSession {
  onRecordingStart(options: RecordingStartOptions): Promise<void>;
  finalize(
    audio: StopRecordingResponse,
    options?: FinalizeOptions,
  ): Promise<TranscriptionSessionResult>;
  cleanup(): void;
}
