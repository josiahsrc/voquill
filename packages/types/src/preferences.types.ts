import type {
  AgentMode,
  DictationPillVisibility,
  Nullable,
  PostProcessingMode,
  TranscriptionMode,
} from "./common.types";

export type UserPreferences = {
  userId: string;
  transcriptionMode: Nullable<TranscriptionMode>;
  transcriptionApiKeyId: Nullable<string>;
  transcriptionDevice: Nullable<string>;
  transcriptionModelSize: Nullable<string>;
  postProcessingMode: Nullable<PostProcessingMode>;
  postProcessingApiKeyId: Nullable<string>;
  postProcessingOllamaUrl: Nullable<string>;
  postProcessingOllamaModel: Nullable<string>;
  activeToneId: Nullable<string>;
  gotStartedAt: Nullable<number>;
  gpuEnumerationEnabled: boolean;
  agentMode: Nullable<AgentMode>;
  agentModeApiKeyId: Nullable<string>;
  lastSeenFeature: Nullable<string>;
  preferredMicrophone: Nullable<string>;
  ignoreUpdateDialog: boolean;
  incognitoModeEnabled: boolean;
  incognitoModeIncludeInStats: boolean;
  dictationPillVisibility: DictationPillVisibility;

  // deprecated
  isEnterprise: boolean;
};
