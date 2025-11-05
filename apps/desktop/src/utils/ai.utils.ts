import { UserPreferences } from "@repo/types";
import { AppState } from "../state/app.state";
import { DEFAULT_POST_PROCESSING_MODE, DEFAULT_TRANSCRIPTION_MODE } from "../types/ai.types";
import { getMyEffectiveUserId } from "./user.utils";

export const applyAiPreferences = (draft: AppState, preferences: UserPreferences): void => {
  const myUserId = getMyEffectiveUserId(draft);
  if (preferences.userId !== myUserId) {
    return;
  }

  const transcriptionMode =
    preferences.transcriptionMode ?? DEFAULT_TRANSCRIPTION_MODE;
  draft.settings.aiTranscription.mode = transcriptionMode;
  draft.settings.aiTranscription.selectedApiKeyId = preferences.transcriptionApiKeyId ?? null;

  const postProcessingMode =
    preferences.postProcessingMode ?? DEFAULT_POST_PROCESSING_MODE;
  draft.settings.aiPostProcessing.mode = postProcessingMode;
  draft.settings.aiPostProcessing.selectedApiKeyId = preferences.postProcessingApiKeyId ?? null;
};
