import type {
  AuthContext,
  EnterpriseConfig,
  EnterpriseLicense,
  LlmProvider,
  Nullable,
  SttProvider,
  Term,
  Tone,
  UserWithAuth,
} from "@repo/types";
import {
  INITIAL_LLM_PROVIDERS_STATE,
  type LlmProvidersState,
} from "./llm-providers.state";
import { INITIAL_LOGIN_STATE, type LoginState } from "./login.state";
import {
  INITIAL_SETTINGS_STATE,
  type SettingsState,
} from "./settings.state";
import {
  INITIAL_STT_PROVIDERS_STATE,
  type SttProvidersState,
} from "./stt-providers.state";
import { INITIAL_TERMS_STATE, type TermsState } from "./terms.state";
import { INITIAL_TONES_STATE, type TonesState } from "./tones.state";
import { INITIAL_USERS_STATE, type UsersState } from "./users.state";

export type SnackbarMode = "info" | "success" | "error";

export type AppState = {
  initialized: boolean;
  auth: Nullable<AuthContext>;
  token: Nullable<string>;
  refreshToken: Nullable<string>;

  enterpriseConfig: Nullable<EnterpriseConfig>;
  enterpriseLicense: Nullable<EnterpriseLicense>;

  termById: Record<string, Term>;
  toneById: Record<string, Tone>;
  userWithAuthById: Record<string, UserWithAuth>;
  sttProviderById: Record<string, SttProvider>;
  llmProviderById: Record<string, LlmProvider>;

  login: LoginState;
  terms: TermsState;
  tones: TonesState;
  users: UsersState;
  settings: SettingsState;
  sttProviders: SttProvidersState;
  llmProviders: LlmProvidersState;

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

  enterpriseConfig: null,
  enterpriseLicense: null,

  termById: {},
  toneById: {},
  userWithAuthById: {},
  sttProviderById: {},
  llmProviderById: {},

  login: INITIAL_LOGIN_STATE,
  settings: INITIAL_SETTINGS_STATE,
  terms: INITIAL_TERMS_STATE,
  tones: INITIAL_TONES_STATE,
  users: INITIAL_USERS_STATE,
  sttProviders: INITIAL_STT_PROVIDERS_STATE,
  llmProviders: INITIAL_LLM_PROVIDERS_STATE,

  snackbarCounter: 0,
  snackbarMode: "info",
  snackbarDuration: 3000,
  snackbarTransitionDuration: undefined,
};
