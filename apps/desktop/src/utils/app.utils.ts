import { User } from "@repo/types";
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
