import type { Nullable, PostProcessingMode, TranscriptionMode } from "./common.types";

export type UserPreferences = {
  userId: string;
  transcriptionMode: Nullable<TranscriptionMode>;
  transcriptionApiKeyId: Nullable<string>;
  postProcessingMode: Nullable<PostProcessingMode>;
  postProcessingApiKeyId: Nullable<string>;
};
