import { Nullable, User } from "@repo/types";
import { getRec } from "@repo/utilities";
import type { AppState } from "../state/app.state";
import { PostProcessingMode, ProcessingMode } from "../types/ai.types";

export const getMyUserId = (state: AppState): string =>
  state.currentUserId ?? "local-user-id";

export const getMyUser = (state: AppState): Nullable<User> => {
  return getRec(state.userById, getMyUserId(state)) ?? null;
};

export const getMyUserName = (state: AppState): string => {
  const user = getMyUser(state);
  return user?.name || "Guest";
};


const hasValidApiKey = (state: AppState, id: Nullable<string>): boolean => {
  if (!id) {
    return false;
  }

  return Boolean(state.apiKeyById[id]);
};

type TranscriptionPreference = {
  mode: ProcessingMode;
  apiKeyId: Nullable<string>;
};

type PostProcessingPreference = {
  mode: PostProcessingMode;
  apiKeyId: Nullable<string>;
};

export const getTranscriptionPreferenceFromState = (
  state: AppState,
): TranscriptionPreference | null => {
  const { mode, selectedApiKeyId } = state.settings.aiTranscription;

  if (mode === "local") {
    return { mode, apiKeyId: null };
  }

  if (mode === "api" && hasValidApiKey(state, selectedApiKeyId)) {
    return { mode, apiKeyId: selectedApiKeyId };
  }

  return null;
};

export const getPostProcessingPreferenceFromState = (
  state: AppState,
): PostProcessingPreference | null => {
  const { mode, selectedApiKeyId } = state.settings.aiPostProcessing;

  if (mode === "none") {
    return { mode, apiKeyId: null };
  }

  if (mode === "api" && hasValidApiKey(state, selectedApiKeyId)) {
    return { mode, apiKeyId: selectedApiKeyId };
  }

  return null;
};