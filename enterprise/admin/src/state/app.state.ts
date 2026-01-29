import type { AuthContext, Nullable, Term, UserWithAuth } from "@repo/types";
import { INITIAL_LOGIN_STATE, type LoginState } from "./login.state";
import { INITIAL_TERMS_STATE, type TermsState } from "./terms.state";
import { INITIAL_USERS_STATE, type UsersState } from "./users.state";

export type SnackbarMode = "info" | "success" | "error";

export type AppState = {
  initialized: boolean;
  auth: Nullable<AuthContext>;
  token: Nullable<string>;
  refreshToken: Nullable<string>;

  termById: Record<string, Term>;
  userWithAuthById: Record<string, UserWithAuth>;

  login: LoginState;
  terms: TermsState;
  users: UsersState;

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
  userWithAuthById: {},

  login: INITIAL_LOGIN_STATE,
  terms: INITIAL_TERMS_STATE,
  users: INITIAL_USERS_STATE,

  snackbarCounter: 0,
  snackbarMode: "info",
  snackbarDuration: 3000,
  snackbarTransitionDuration: undefined,
};
