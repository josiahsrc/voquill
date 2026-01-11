import { UserPreferences } from "@repo/types";
import { AppState } from "../state/app.state";
import {
  CPU_DEVICE_VALUE,
  DEFAULT_AGENT_MODE,
  DEFAULT_MODEL_SIZE,
  DEFAULT_POST_PROCESSING_MODE,
  DEFAULT_TRANSCRIPTION_MODE,
} from "../types/ai.types";
import { getMyEffectiveUserId } from "./user.utils";

export const applyAiPreferences = (
  draft: AppState,
  preferences: UserPreferences,
): void => {
  const myUserId = getMyEffectiveUserId(draft);
  if (preferences.userId !== myUserId) {
    return;
  }

  const transcriptionMode =
    preferences.transcriptionMode ?? DEFAULT_TRANSCRIPTION_MODE;
  draft.settings.aiTranscription.mode = transcriptionMode;
  draft.settings.aiTranscription.selectedApiKeyId =
    preferences.transcriptionApiKeyId ?? null;
  draft.settings.aiTranscription.device =
    preferences.transcriptionDevice ?? CPU_DEVICE_VALUE;
  draft.settings.aiTranscription.modelSize =
    preferences.transcriptionModelSize ?? DEFAULT_MODEL_SIZE;
  draft.settings.aiTranscription.gpuEnumerationEnabled =
    preferences.gpuEnumerationEnabled ?? false;

  const postProcessingMode =
    preferences.postProcessingMode ?? DEFAULT_POST_PROCESSING_MODE;
  draft.settings.aiPostProcessing.mode = postProcessingMode;
  draft.settings.aiPostProcessing.selectedApiKeyId =
    preferences.postProcessingApiKeyId ?? null;

  const agentMode = preferences.agentMode ?? DEFAULT_AGENT_MODE;
  draft.settings.agentMode.mode = agentMode as any;
  draft.settings.agentMode.selectedApiKeyId =
    preferences.agentModeApiKeyId ?? null;

  draft.settings.languageSwitch.enabled =
    preferences.languageSwitchEnabled ?? false;
  draft.settings.languageSwitch.secondaryLanguage =
    preferences.secondaryDictationLanguage ?? null;
  draft.settings.languageSwitch.activeLanguage =
    preferences.activeDictationLanguage ?? "primary";
};
