import { ApiKey, Hotkey, Nullable, Term, Transcription, User } from "@repo/types";
import type { AppState, SnackbarMode } from "../state/app.state";

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

export const getIsSignedIn = (state: AppState): boolean => !!state.currentUserId;

export const getMyUserId = (state: AppState): Nullable<string> =>
  state.currentUserId;


export const getLocalUserId = (draft: AppState): string => getMyUserId(draft) ?? "local-user-id";

export const registerUsers = (draft: AppState, users: User[]): void => {
  for (const user of users) {
    draft.userById[user.id] = user;
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
