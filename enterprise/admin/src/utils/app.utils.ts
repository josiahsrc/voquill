import type { LlmProvider, OidcProvider, SttProvider, Term, Tone, UserWithAuth } from "@repo/types";
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

export const registerTerms = (draft: AppState, terms: Term[]): void => {
  for (const term of terms) {
    draft.termById[term.id] = term;
  }
};

export const registerTones = (draft: AppState, tones: Tone[]): void => {
  for (const tone of tones) {
    draft.toneById[tone.id] = tone;
  }
};

export const registerUsers = (draft: AppState, users: UserWithAuth[]): void => {
  for (const user of users) {
    draft.userWithAuthById[user.id] = user;
  }
};

export const registerSttProviders = (
  draft: AppState,
  providers: SttProvider[],
): void => {
  for (const provider of providers) {
    draft.sttProviderById[provider.id] = provider;
  }
};

export const registerLlmProviders = (
  draft: AppState,
  providers: LlmProvider[],
): void => {
  for (const provider of providers) {
    draft.llmProviderById[provider.id] = provider;
  }
};

export const registerOidcProviders = (
  draft: AppState,
  providers: OidcProvider[],
): void => {
  for (const provider of providers) {
    draft.oidcProviderById[provider.id] = provider;
  }
};
