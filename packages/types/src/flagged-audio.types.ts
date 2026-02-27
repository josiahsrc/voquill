import { Nullable } from "./common.types";

export type FlaggedAudio = {
  id: string;
  filePath: string;
  feedback: string;
  prompt: Nullable<string>;
  rawTranscription: string;
  postProcessedTranscription: Nullable<string>;
  transcriptionProvider: string;
  postProcessingProvider: Nullable<string>;
};
