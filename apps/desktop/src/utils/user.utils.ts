import { Nullable, User, UserPreferences } from "@repo/types";
import { getRec } from "@repo/utilities";
import type { AppState } from "../state/app.state";
import { applyAiPreferences } from "./ai.utils";
import { registerUsers } from "./app.utils";
import { getMemberExceedsLimitsFromState, getMyMember } from "./member.utils";

export const LOCAL_USER_ID = "local-user-id";

export const getHasEmailProvider = (state: AppState): boolean => {
  const auth = state.auth;
  const providers = auth?.providerData ?? [];
  const providerIds = providers.map((p) => p.providerId);
  return providerIds.includes("password");
};

export const getHasCloudAccess = (state: AppState): boolean => {
  return getMyMember(state)?.plan === "pro";
}

export const getMyCloudUserId = (state: AppState): Nullable<string> => state.auth?.uid ?? null;

export const getMyEffectiveUserId = (state: AppState): string => {
  const isCloud = getHasCloudAccess(state);
  if (isCloud) {
    return getMyCloudUserId(state) ?? LOCAL_USER_ID;
  }

  return LOCAL_USER_ID;
}

export const getMyUser = (state: AppState): Nullable<User> => {
  return getRec(state.userById, getMyEffectiveUserId(state)) ?? null;
};

export const getMyUserPreferences = (state: AppState): Nullable<UserPreferences> => {
  return getRec(state.userPreferencesById, getMyEffectiveUserId(state)) ?? null;
};

export const getMyUserName = (state: AppState): string => {
  const user = getMyUser(state);
  return user?.name || "Guest";
};

export const getIsSignedIn = (state: AppState): boolean => {
  return !!state.auth;
}

export const setCurrentUser = (draft: AppState, user: User): void => {
  registerUsers(draft, [user]);
};

export const registerUserPreferences = (
  draft: AppState,
  preferences: UserPreferences[],
): void => {
  for (const pref of preferences) {
    draft.userPreferencesById[pref.userId] = pref;
    applyAiPreferences(draft, pref);
  }
};

type BaseTranscriptionPrefs = {
  warnings: string[];
}

export type CloudTranscriptionPrefs = BaseTranscriptionPrefs & {
  mode: "cloud";
}

export type LocalTranscriptionPrefs = BaseTranscriptionPrefs & {
  mode: "local";
}

export type ApiTranscriptionPrefs = BaseTranscriptionPrefs & {
  mode: "api";
  apiKeyId: string;
  apiKeyValue: string;
}

export type TranscriptionPrefs =
  | CloudTranscriptionPrefs
  | LocalTranscriptionPrefs
  | ApiTranscriptionPrefs;

export const getTranscriptionPrefs = (state: AppState): TranscriptionPrefs => {
  const config = state.settings.aiTranscription;
  const apiKey = getRec(state.apiKeyById, config.selectedApiKeyId)?.keyFull;
  const cloudAvailable = getHasCloudAccess(state);
  const exceedsLimits = getMemberExceedsLimitsFromState(state);
  const warnings: string[] = [];

  if (config.mode === "cloud") {
    if (cloudAvailable) {
      if (exceedsLimits) {
        warnings.push("Cloud limit exceeded.");
      } else {
        return { mode: "cloud", warnings };
      }
    } else {
      warnings.push("Cloud post-processing is not available. Please check your subscription.");
    }
  }

  if (config.mode === "api") {
    if (apiKey) {
      return { mode: "api", apiKeyId: config.selectedApiKeyId!, apiKeyValue: apiKey, warnings };
    } else {
      warnings.push("No API key configured for API post-processing.");
    }
  }

  return { mode: "local", warnings };
}

type BaseGenerativePrefs = {
  warnings: string[];
}

export type CloudGenerativePrefs = BaseGenerativePrefs & {
  mode: "cloud";
}

export type ApiGenerativePrefs = BaseGenerativePrefs & {
  mode: "api";
  apiKeyId: string;
  apiKeyValue: string;
}

export type NoneGenerativePrefs = BaseGenerativePrefs & {
  mode: "none";
}

export type GenerativePrefs =
  | CloudGenerativePrefs
  | ApiGenerativePrefs
  | NoneGenerativePrefs;

export const getGenerativePrefs = (state: AppState): GenerativePrefs => {
  const config = state.settings.aiPostProcessing;
  const apiKey = getRec(state.apiKeyById, config.selectedApiKeyId)?.keyFull;
  const exceedsLimits = getMemberExceedsLimitsFromState(state);
  const cloudAvailable = getHasCloudAccess(state);
  const warnings: string[] = [];

  if (config.mode === "cloud") {
    if (cloudAvailable) {
      if (exceedsLimits) {
        warnings.push("Cloud limit exceeded.");
      } else {
        return { mode: "cloud", warnings };
      }
    } else {
      warnings.push("Cloud post-processing is not available. Please check your subscription.");
    }
  }

  if (config.mode === "api") {
    if (apiKey) {
      return { mode: "api", apiKeyId: config.selectedApiKeyId!, apiKeyValue: apiKey, warnings };
    } else {
      warnings.push("No API key configured for API post-processing.");
    }
  }

  return { mode: "none", warnings };
}
