import { ApiKey, Hotkey, Term, Transcription, User } from "@repo/types";
import type { AppState, SnackbarMode } from "../state/app.state";
import {
  DEFAULT_POST_PROCESSING_MODE,
  DEFAULT_PROCESSING_MODE,
} from "../types/ai.types";

export type ShowSnackbarOpts = {
  duration?: number;
  transitionDuration?: number;
  mode?: SnackbarMode;
};

export const setSnackbar = (
  draft: AppState,
  message: string,
  opts?: ShowSnackbarOpts,
): void => {
  draft.snackbarMessage = message;
  draft.snackbarCounter++;
  draft.snackbarMode = opts?.mode ?? "info";
  draft.snackbarDuration = opts?.duration ?? 3000;
  draft.snackbarTransitionDuration = opts?.transitionDuration;
};

const getLocalUserId = (draft: AppState): string => draft.currentUserId ?? "local-user-id";

const applyAiPreferencesFromUser = (draft: AppState, user: User): void => {
  const myUserId = getLocalUserId(draft);
  if (user.id !== myUserId) {
    return;
  }

  const transcriptionMode = user.preferredTranscriptionMode ?? DEFAULT_PROCESSING_MODE;
  draft.settings.aiTranscription.mode = transcriptionMode;
  draft.settings.aiTranscription.selectedApiKeyId =
    transcriptionMode === "api" ? user.preferredTranscriptionApiKeyId ?? null : null;

  const postProcessingMode = user.preferredPostProcessingMode ?? DEFAULT_POST_PROCESSING_MODE;
  draft.settings.aiPostProcessing.mode = postProcessingMode;
  draft.settings.aiPostProcessing.selectedApiKeyId =
    postProcessingMode === "api" ? user.preferredPostProcessingApiKeyId ?? null : null;
};

export const registerUsers = (draft: AppState, users: User[]): void => {
  for (const user of users) {
    draft.userById[user.id] = user;
    applyAiPreferencesFromUser(draft, user);
  }
};

export const registerTranscriptions = (
  draft: AppState,
  transcriptions: Transcription[],
): void => {
  for (const transcription of transcriptions) {
    draft.transcriptionById[transcription.id] = transcription;
  }
};

export const registerTerms = (draft: AppState, terms: Term[]): void => {
  for (const term of terms) {
    draft.termById[term.id] = term;
  }
};

export const registerHotkeys = (draft: AppState, hotkeys: Hotkey[]): void => {
  for (const hotkey of hotkeys) {
    draft.hotkeyById[hotkey.id] = hotkey;
  }
};

export const registerApiKeys = (draft: AppState, apiKeys: ApiKey[]): void => {
  for (const apiKey of apiKeys) {
    draft.apiKeyById[apiKey.id] = apiKey;
  }
};
