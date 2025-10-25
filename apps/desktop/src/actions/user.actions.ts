import { firemix } from "@firemix/client";
import { Nullable, User } from "@repo/types";
import {
  DEFAULT_POST_PROCESSING_MODE,
  DEFAULT_PROCESSING_MODE,
  type PostProcessingMode,
  type ProcessingMode,
} from "../types/ai.types";
import { getUserRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import { registerUsers } from "../utils/app.utils";
import { getMyUser } from "../utils/user.utils";
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
      registerUsers(draft, [saved]);
    });
  } catch (error) {
    console.error("Failed to update user", error);
    showErrorSnackbar(saveErrorMessage);
    throw error;
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

const hasValidApiKey = (state: ReturnType<typeof getAppState>, id: Nullable<string>): boolean => {
  if (!id) {
    return false;
  }

  return Boolean(state.apiKeyById[id]);
};

const persistAiPreferences = async (): Promise<void> => {
  const state = getAppState();
  const user = getMyUser(state);

  if (!user) {
    return;
  }

  const transcriptionMode = state.settings.aiTranscription.mode;
  const transcriptionSelectedId = state.settings.aiTranscription.selectedApiKeyId;
  const transcriptionHasValidKey = hasValidApiKey(state, transcriptionSelectedId);

  let shouldUpdateTranscription = false;
  let nextTranscriptionMode = user.preferredTranscriptionMode ?? DEFAULT_PROCESSING_MODE;
  let nextTranscriptionKey = user.preferredTranscriptionApiKeyId ?? null;

  if (transcriptionMode === "local") {
    nextTranscriptionMode = "local";
    nextTranscriptionKey = null;
    shouldUpdateTranscription =
      user.preferredTranscriptionMode !== "local" || user.preferredTranscriptionApiKeyId !== null;
  } else if (transcriptionMode === "api" && transcriptionHasValidKey) {
    nextTranscriptionMode = "api";
    nextTranscriptionKey = transcriptionSelectedId;
    shouldUpdateTranscription =
      user.preferredTranscriptionMode !== "api" || user.preferredTranscriptionApiKeyId !== transcriptionSelectedId;
  }

  const postProcessingMode = state.settings.aiPostProcessing.mode;
  const postProcessingSelectedId = state.settings.aiPostProcessing.selectedApiKeyId;
  const postProcessingHasValidKey = hasValidApiKey(state, postProcessingSelectedId);

  let shouldUpdatePostProcessing = false;
  let nextPostProcessingMode = user.preferredPostProcessingMode ?? DEFAULT_POST_PROCESSING_MODE;
  let nextPostProcessingKey = user.preferredPostProcessingApiKeyId ?? null;

  if (postProcessingMode === "none") {
    nextPostProcessingMode = "none";
    nextPostProcessingKey = null;
    shouldUpdatePostProcessing =
      user.preferredPostProcessingMode !== "none" || user.preferredPostProcessingApiKeyId !== null;
  } else if (postProcessingMode === "api" && postProcessingHasValidKey) {
    nextPostProcessingMode = "api";
    nextPostProcessingKey = postProcessingSelectedId;
    shouldUpdatePostProcessing =
      user.preferredPostProcessingMode !== "api" ||
      user.preferredPostProcessingApiKeyId !== postProcessingSelectedId;
  }

  if (!shouldUpdateTranscription && !shouldUpdatePostProcessing) {
    return;
  }

  await updateUser(
    (draft) => {
      if (shouldUpdateTranscription) {
        draft.preferredTranscriptionMode = nextTranscriptionMode;
        draft.preferredTranscriptionApiKeyId = nextTranscriptionKey;
      }
      if (shouldUpdatePostProcessing) {
        draft.preferredPostProcessingMode = nextPostProcessingMode;
        draft.preferredPostProcessingApiKeyId = nextPostProcessingKey;
      }
    },
    "Unable to update AI preferences. User not found.",
    "Failed to save AI preferences. Please try again.",
  );
};

export const setPreferredTranscriptionMode = async (
  mode: ProcessingMode,
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
