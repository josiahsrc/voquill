import { Nullable, User, UserPreferences } from "@repo/types";
import { getUserPreferencesRepo, getUserRepo } from "../repos";
import { CloudUserRepo } from "../repos/user.repo";
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
  LOCAL_USER_ID,
  setCurrentUser,
  setUserPreferences,
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

export const createDefaultPreferences = (): UserPreferences => ({
  userId: LOCAL_USER_ID,
  transcriptionMode: DEFAULT_TRANSCRIPTION_MODE,
  transcriptionApiKeyId: null,
  transcriptionDevice: null,
  transcriptionModelSize: null,
  postProcessingMode: DEFAULT_POST_PROCESSING_MODE,
  postProcessingApiKeyId: null,
  postProcessingOllamaUrl: null,
  postProcessingOllamaModel: null,
  activeToneId: null,
  gotStartedAt: null,
  gpuEnumerationEnabled: false,
  agentMode: null,
  agentModeApiKeyId: null,
  lastSeenFeature: null,
  isEnterprise: false,
  languageSwitchEnabled: false,
  secondaryDictationLanguage: null,
  activeDictationLanguage: "primary",
  preferredMicrophone: null,
});

const updateUserPreferences = async (
  updateCallback: (preferences: UserPreferences) => void,
  saveErrorMessage: string,
): Promise<void> => {
  const state = getAppState();
  const myUserId = getMyEffectiveUserId(state);

  const existing = getMyUserPreferences(state) ?? createDefaultPreferences();
  const payload: UserPreferences = { ...existing, userId: myUserId };
  updateCallback(payload);

  try {
    const saved = await getUserPreferencesRepo().setUserPreferences(payload);
    produceAppState((draft) => {
      setUserPreferences(draft, saved);
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

export const addWordsToCurrentUser = async (
  wordCount: number,
): Promise<void> => {
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
      getUserPreferencesRepo().getUserPreferences(),
    ]);
    produceAppState((draft) => {
      if (user) {
        setCurrentUser(draft, user);
      }

      console.log("REFRESHING", userId, preferences);
      if (preferences) {
        setUserPreferences(draft, preferences);
      } else {
        draft.userPrefs = null;
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

  await updateUserPreferences((preferences) => {
    preferences.preferredMicrophone = normalized;
  }, "Failed to save microphone preference. Please try again.");
};

export const migratePreferredMicrophoneToPreferences = async (): Promise<void> => {
  const state = getAppState();
  const user = getMyUser(state);
  if (!user) {
    return;
  }

  if (user.hasMigratedPreferredMicrophone) {
    return;
  }

  const microphoneToMigrate = user.preferredMicrophone ?? null;
  if (microphoneToMigrate) {
    await updateUserPreferences((preferences) => {
      preferences.preferredMicrophone = microphoneToMigrate;
    }, "Failed to migrate microphone preference.");
  }

  await updateUser(
    (u) => {
      u.hasMigratedPreferredMicrophone = true;
    },
    "Unable to mark microphone as migrated. User not found.",
    "Failed to mark microphone as migrated.",
  );
};

export const setPreferredLanguage = async (
  language: Nullable<string>,
): Promise<void> => {
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

export const finishTutorial = async (): Promise<void> => {
  await updateUser(
    (user) => {
      user.hasFinishedTutorial = true;
    },
    "Unable to update tutorial status. User not found.",
    "Failed to update tutorial status. Please try again.",
  );
};

export const persistAiPreferences = async (): Promise<void> => {
  const state = getAppState();
  await updateUserPreferences((preferences) => {
    preferences.postProcessingMode = state.settings.aiPostProcessing.mode;
    preferences.postProcessingApiKeyId =
      state.settings.aiPostProcessing.selectedApiKeyId ?? null;
    preferences.agentMode = state.settings.agentMode.mode;
    preferences.agentModeApiKeyId =
      state.settings.agentMode.selectedApiKeyId ?? null;
    preferences.transcriptionMode = state.settings.aiTranscription.mode;
    preferences.transcriptionApiKeyId =
      state.settings.aiTranscription.selectedApiKeyId ?? null;
    preferences.transcriptionDevice =
      state.settings.aiTranscription.device ?? null;
    preferences.transcriptionModelSize =
      state.settings.aiTranscription.modelSize ?? null;
    preferences.gpuEnumerationEnabled =
      state.settings.aiTranscription.gpuEnumerationEnabled;
    preferences.languageSwitchEnabled =
      state.settings.languageSwitch.enabled ?? false;
    preferences.secondaryDictationLanguage =
      state.settings.languageSwitch.secondaryLanguage ?? null;
    preferences.activeDictationLanguage =
      state.settings.languageSwitch.activeLanguage ?? "primary";
  }, "Failed to save AI preferences. Please try again.");
};

export const setPreferredTranscriptionMode = async (
  mode: TranscriptionMode,
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.aiTranscription.mode = mode;
  });

  await persistAiPreferences();
};

export const setAllModesToCloud = async (): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.aiTranscription.mode = "cloud";
    draft.settings.aiPostProcessing.mode = "cloud";
    draft.settings.agentMode.mode = "cloud";
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

export const setPreferredTranscriptionDevice = async (
  device: string,
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.aiTranscription.device = device;
  });

  await persistAiPreferences();
};

export const setPreferredTranscriptionModelSize = async (
  modelSize: string,
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.aiTranscription.modelSize = modelSize;
  });

  await persistAiPreferences();
};

export const setGpuEnumerationEnabled = async (
  enabled: boolean,
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.aiTranscription.gpuEnumerationEnabled = enabled;
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

export const setPreferredAgentMode = async (
  mode: PostProcessingMode,
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.agentMode.mode = mode;
  });

  await persistAiPreferences();
};

export const setPreferredAgentModeApiKeyId = async (
  id: Nullable<string>,
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.agentMode.selectedApiKeyId = id;
  });

  await persistAiPreferences();
};

export const syncAiPreferences = persistAiPreferences;

export const getDefaultSecondaryLanguage = (
  primaryLanguage: string,
): string => {
  const baseLanguage = primaryLanguage.split("-")[0].toLowerCase();
  return baseLanguage === "en" ? "fr" : "en";
};

export const setLanguageSwitchEnabled = async (
  enabled: boolean,
): Promise<void> => {
  const state = getAppState();

  produceAppState((draft) => {
    draft.settings.languageSwitch.enabled = enabled;

    if (enabled && !draft.settings.languageSwitch.secondaryLanguage) {
      const user = getMyUser(state);
      const primaryLanguage = user?.preferredLanguage ?? "en";
      draft.settings.languageSwitch.secondaryLanguage =
        getDefaultSecondaryLanguage(primaryLanguage);
    }

    if (!enabled) {
      draft.settings.languageSwitch.activeLanguage = "primary";
    }
  });

  await persistAiPreferences();
};

export const setSecondaryDictationLanguage = async (
  language: Nullable<string>,
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.languageSwitch.secondaryLanguage = language;
  });

  await persistAiPreferences();
};

export const toggleActiveDictationLanguage = async (): Promise<void> => {
  const state = getAppState();
  const { enabled, secondaryLanguage, activeLanguage } =
    state.settings.languageSwitch;

  if (!enabled || !secondaryLanguage) {
    return;
  }

  const newActiveLanguage =
    activeLanguage === "primary" ? "secondary" : "primary";

  produceAppState((draft) => {
    draft.settings.languageSwitch.activeLanguage = newActiveLanguage;
  });

  await persistAiPreferences();
};

export const setActiveDictationLanguage = async (
  language: "primary" | "secondary",
): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.languageSwitch.activeLanguage = language;
  });

  await persistAiPreferences();
};

export const migrateLocalUserToCloud = async (): Promise<void> => {
  const state = getAppState();
  const userId = state.auth?.uid;
  if (!userId) {
    return;
  }

  const localUser = state.userById[LOCAL_USER_ID];
  if (!localUser) {
    return;
  }

  if (state.userById[userId]) {
    return;
  }

  const repo = new CloudUserRepo();
  const now = new Date().toISOString();
  const payload: User = {
    ...localUser,
    id: userId,
    createdAt: localUser.createdAt ?? now,
    updatedAt: now,
  };

  try {
    const saved = await repo.setUser(payload);
    produceAppState((draft) => {
      setCurrentUser(draft, saved);
    });
  } catch (error) {
    console.error("Failed migrating local user to cloud", error);
    throw error;
  }
};

export const setGotStartedAtNow = async (): Promise<void> => {
  await updateUserPreferences((preferences) => {
    preferences.gotStartedAt = Date.now();
  }, "Failed to save got started timestamp. Please try again.");
};

export const clearGotStartedAt = async (): Promise<void> => {
  await updateUserPreferences((preferences) => {
    preferences.gotStartedAt = null;
  }, "Failed to clear got started timestamp. Please try again.");
};

export const markFeatureSeen = async (feature: string): Promise<void> => {
  await updateUserPreferences((preferences) => {
    preferences.lastSeenFeature = feature;
  }, "Failed to save feature seen status. Please try again.");
};
