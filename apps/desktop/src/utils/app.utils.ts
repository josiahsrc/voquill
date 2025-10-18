import { Hotkey, Term, Transcription, User } from "@repo/types";
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
