import { Nullable } from "./common.types";

export type FlaggedAudio = {
  id: string;
  filePath: string;
  feedback: string;
  transcriptionPrompt: Nullable<string>;
  postProcessingPrompt: Nullable<string>;
  rawTranscription: string;
  postProcessedTranscription: Nullable<string>;
  transcriptionProvider: string;
  postProcessingProvider: Nullable<string>;
};
