import { Nullable, User, UserPreferences } from "@repo/types";
import { getUserPreferencesRepo, getUserRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import {
  DEFAULT_POST_PROCESSING_MODE,
  DEFAULT_TRANSCRIPTION_MODE,
  type PostProcessingMode,
  type TranscriptionMode,
} from "../types/ai.types";
import {
  getMyEffectiveUserId,
  getMyUser,
  getMyUserPreferences,
  registerUserPreferences,
  setCurrentUser,
} from "../utils/user.utils";
import { type Locale } from "../i18n/config";
import { showErrorSnackbar } from "./app.actions";

const updateUser = async (
  updateCallback: (user: User) => void,
  errorMessage: string,
  saveErrorMessage: string,
): Promise<void> => {
  const state = getAppState();
  const existing = getMyUser(state);
  if (!existing) {
    showErrorSnackbar(errorMessage);
    return;
  }

  const repo = getUserRepo();
  const payload: User = {
    ...existing,
    updatedAt: new Date().toISOString(),
  };

  updateCallback(payload);

  try {
    const saved = await repo.setUser(payload);
    produceAppState((draft) => {
      setCurrentUser(draft, saved);
    });
  } catch (error) {
    console.error("Failed to update user", error);
    showErrorSnackbar(saveErrorMessage);
    throw error;
  }
};

export const createDefaultPreferences = (userId: string): UserPreferences => ({
  userId,
  transcriptionMode: DEFAULT_TRANSCRIPTION_MODE,
  transcriptionApiKeyId: null,
  postProcessingMode: DEFAULT_POST_PROCESSING_MODE,
  postProcessingApiKeyId: null,
  activeToneId: null,
  hasCreatedInitialTones: false,
});

const updateUserPreferences = async (
  updateCallback: (preferences: UserPreferences) => void,
  saveErrorMessage: string,
): Promise<void> => {
  const state = getAppState();
  const myUserId = getMyEffectiveUserId(state);

  const existing = getMyUserPreferences(state) ?? createDefaultPreferences(myUserId);
  const payload: UserPreferences = { ...existing, userId: myUserId };
  updateCallback(payload);

  try {
    const saved = await getUserPreferencesRepo().setUserPreferences(payload);
    produceAppState((draft) => {
      registerUserPreferences(draft, [saved]);
    });
  } catch (error) {
    console.error("Failed to update user preferences", error);
    showErrorSnackbar(saveErrorMessage);
    throw error;
  }
};

const getCurrentUsageMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

export const addWordsToCurrentUser = async (wordCount: number): Promise<void> => {
  if (wordCount <= 0) {
    return;
  }

  await updateUser(
    (user) => {
      const currentMonth = getCurrentUsageMonth();
      if (user.wordsThisMonthMonth !== currentMonth) {
        user.wordsThisMonth = 0;
        user.wordsThisMonthMonth = currentMonth;
      }

      user.wordsThisMonth += wordCount;
      user.wordsTotal += wordCount;
    },
    "Unable to update usage. User not found.",
    "Failed to update usage metrics. Please try again.",
  );
};

export const refreshCurrentUser = async (): Promise<void> => {
  const state = getAppState();
  const userId = getMyEffectiveUserId(state);

  try {
    const [user, preferences] = await Promise.all([
      getUserRepo().getUser(userId),
      getUserPreferencesRepo().getUserPreferences(userId),
    ]);
    produceAppState((draft) => {
      if (user) {
        setCurrentUser(draft, user);
      }

      if (preferences) {
        registerUserPreferences(draft, [preferences]);
      } else {
        delete draft.userPreferencesById[userId];
      }
    });
  } catch (error) {
    console.error("Failed to refresh user", error);
  }
};

export const setPreferredMicrophone = async (
  preferredMicrophone: Nullable<string>,
) => {
  const trimmed = preferredMicrophone?.trim() ?? null;
  const normalized = trimmed && trimmed.length > 0 ? trimmed : null;

  await updateUser(
    (user) => {
      user.preferredMicrophone = normalized;
    },
    "Unable to update microphone preference. User not found.",
    "Failed to save microphone preference. Please try again.",
  );
};

export const setPreferredLanguage = async (language: Locale): Promise<void> => {
  await updateUser(
    (user) => {
      user.preferredLanguage = language;
    },
    "Unable to update preferred language. User not found.",
    "Failed to save preferred language. Please try again.",
  );
};

export const setInteractionChimeEnabled = async (enabled: boolean) => {
  await updateUser(
    (user) => {
      user.playInteractionChime = enabled;
    },
    "Unable to update interaction chime. User not found.",
    "Failed to save interaction chime preference. Please try again.",
  );
};

export const setUserName = async (name: string): Promise<void> => {
  const normalized = name.trim();

  await updateUser(
    (user) => {
      user.name = normalized;
    },
    "Unable to update username. User not found.",
    "Failed to save username. Please try again.",
  );
};

const persistAiPreferences = async (): Promise<void> => {
  const state = getAppState();
  await updateUserPreferences(
    (preferences) => {
      preferences.postProcessingMode = state.settings.aiPostProcessing.mode;
      preferences.postProcessingApiKeyId = state.settings.aiPostProcessing.selectedApiKeyId ?? null;
      preferences.transcriptionMode = state.settings.aiTranscription.mode;
      preferences.transcriptionApiKeyId = state.settings.aiTranscription.selectedApiKeyId ?? null;
    },
    "Failed to save AI preferences. Please try again.",
  );
};

export const setPreferredTranscriptionMode = async (
  mode: TranscriptionMode,
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.aiTranscription.mode = mode;
  });

  await persistAiPreferences();
};

export const setPreferredTranscriptionApiKeyId = async (
  id: Nullable<string>,
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.aiTranscription.selectedApiKeyId = id;
  });

  await persistAiPreferences();
};

export const setPreferredPostProcessingMode = async (
  mode: PostProcessingMode,
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.aiPostProcessing.mode = mode;
  });

  await persistAiPreferences();
};

export const setPreferredPostProcessingApiKeyId = async (
  id: Nullable<string>,
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.aiPostProcessing.selectedApiKeyId = id;
  });

  await persistAiPreferences();
};

export const syncAiPreferences = persistAiPreferences;
