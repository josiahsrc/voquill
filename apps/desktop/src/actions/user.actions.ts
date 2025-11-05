import { firemix } from "@firemix/client";
import { Nullable, User } from "@repo/types";
import { getUserRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import {
  type PostProcessingMode,
  type TranscriptionMode,
} from "../types/ai.types";
import {
  getMyEffectiveUserId,
  getMyUser,
  setCurrentUser
} from "../utils/user.utils";
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
  const now = firemix().now();
  const payload: User = {
    ...existing,
    updatedAt: now,
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
    const user = await getUserRepo().getUser(userId);
    produceAppState((draft) => {
      if (user) {
        setCurrentUser(draft, user);
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
  const user = getMyUser(state);

  if (!user) {
    return;
  }

  await updateUser(
    (draft) => {
      draft.preferredPostProcessingMode = state.settings.aiPostProcessing.mode;
      draft.preferredPostProcessingApiKeyId = state.settings.aiPostProcessing.selectedApiKeyId;

      draft.preferredTranscriptionMode = state.settings.aiTranscription.mode;
      draft.preferredTranscriptionApiKeyId = state.settings.aiTranscription.selectedApiKeyId;
    },
    "Unable to update AI preferences. User not found.",
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
