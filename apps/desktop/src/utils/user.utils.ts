import { Nullable, User } from "@repo/types";
import { getRec } from "@repo/utilities";
import type { AppState } from "../state/app.state";
import { PostProcessingMode, ProcessingMode } from "../types/ai.types";
import { registerUsers } from "./app.utils";
import { applyAiPreferencesFromUser } from "./ai.utils";

export const getHasEmailProvider = (state: AppState): boolean => {
  const auth = state.auth;
  const providers = auth?.providerData ?? [];
  const providerIds = providers.map((p) => p.providerId);
  return providerIds.includes("password");
};

export const getMyCloudUserId = (state: AppState): Nullable<string> => state.auth?.uid ?? null;

export const getMyEffectiveUserId = (draft: AppState): string => getMyCloudUserId(draft) ?? "local-user-id";

export const getMyUser = (state: AppState): Nullable<User> => {
  return getRec(state.userById, getMyCloudUserId(state)) ?? null;
};

export const getMyUserName = (state: AppState): string => {
  const user = getMyUser(state);
  return user?.name || "Guest";
};

export const getIsSignedIn = (state: AppState): boolean => {
  return !!state.auth;
}

const hasValidApiKey = (state: AppState, id: Nullable<string>): boolean => {
  return Boolean(getRec(state.apiKeyById, id));
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
    return { mode: "local", apiKeyId: null };
  }

  if (mode === "cloud") {
    return { mode: "cloud", apiKeyId: null };
  }

  if (mode === "api" && hasValidApiKey(state, selectedApiKeyId)) {
    return { mode: "api", apiKeyId: selectedApiKeyId };
  }

  return null;
};

export const getPostProcessingPreferenceFromState = (
  state: AppState,
): PostProcessingPreference | null => {
  const { mode, selectedApiKeyId } = state.settings.aiPostProcessing;

  if (mode === "none") {
    return { mode: "none", apiKeyId: null };
  }

  if (mode === "cloud") {
    return { mode: "cloud", apiKeyId: null };
  }

  if (mode === "api" && hasValidApiKey(state, selectedApiKeyId)) {
    return { mode: "api", apiKeyId: selectedApiKeyId };
  }

  return null;
};

export const setCurrentUser = (draft: AppState, user: User) => {
  registerUsers(draft, [user]);
  applyAiPreferencesFromUser(draft, user);
}
