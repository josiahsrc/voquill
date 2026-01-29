import type { AuthContext, Nullable, Term } from "@repo/types";
import { INITIAL_LOGIN_STATE, type LoginState } from "./login.state";
import { INITIAL_TERMS_STATE, type TermsState } from "./terms.state";

export type SnackbarMode = "info" | "success" | "error";

export type AppState = {
  initialized: boolean;
  auth: Nullable<AuthContext>;
  token: Nullable<string>;
  refreshToken: Nullable<string>;

  termById: Record<string, Term>;

  login: LoginState;
  terms: TermsState;

  snackbarMessage?: string;
  snackbarCounter: number;
  snackbarMode: SnackbarMode;
  snackbarDuration: number;
  snackbarTransitionDuration?: number;
};

export const INITIAL_APP_STATE: AppState = {
  initialized: false,
  auth: null,
  token: null,
  refreshToken: null,

  termById: {},

  login: INITIAL_LOGIN_STATE,
  terms: INITIAL_TERMS_STATE,

  snackbarCounter: 0,
  snackbarMode: "info",
  snackbarDuration: 3000,
  snackbarTransitionDuration: undefined,
};
