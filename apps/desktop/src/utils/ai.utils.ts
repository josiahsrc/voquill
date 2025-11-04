import { User } from "@repo/types";
import { AppState } from "../state/app.state";
import { DEFAULT_POST_PROCESSING_MODE, DEFAULT_PROCESSING_MODE } from "../types/ai.types";
import { getMyEffectiveUserId } from "./user.utils";

export const applyAiPreferencesFromUser = (draft: AppState, user: User): void => {
  const myUserId = getMyEffectiveUserId(draft);
  if (user.id !== myUserId) {
    return;
  }

  const transcriptionMode =
    user.preferredTranscriptionMode ?? DEFAULT_PROCESSING_MODE;
  draft.settings.aiTranscription.mode = transcriptionMode;
  draft.settings.aiTranscription.selectedApiKeyId = user.preferredTranscriptionApiKeyId ?? null;

  const postProcessingMode =
    user.preferredPostProcessingMode ?? DEFAULT_POST_PROCESSING_MODE;
  draft.settings.aiPostProcessing.mode = postProcessingMode;
  draft.settings.aiPostProcessing.selectedApiKeyId = user.preferredPostProcessingApiKeyId ?? null;
};
