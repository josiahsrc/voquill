import { HandlerOutput } from "@repo/functions";
import {
  ApiKey,
  FullConfig,
  Hotkey,
  Member,
  Nullable,
  Term,
  Tone,
  Transcription,
  User,
  UserPreferences,
} from "@repo/types";
import { AuthUser } from "../types/auth.types";
import { OverlayPhase } from "../types/overlay.types";
import { PermissionMap } from "../types/permission.types";
import { DictionaryState, INITIAL_DICTIONARY_STATE } from "./dictionary.state";
import { INITIAL_LOGIN_STATE, LoginState } from "./login.state";
import { INITIAL_ONBOARDING_STATE, type OnboardingState } from "./onboarding.state";
import { INITIAL_PAYMENT_STATE, PaymentState } from "./payment.state";
import { INITIAL_PRICING_STATE, PricingState } from "./pricing.state";
import { INITIAL_SETTINGS_STATE, SettingsState } from "./settings.state";
import { INITIAL_TONES_STATE, TonesState } from "./tones.state";
import { INITIAL_TRANSCRIPTIONS_STATE, TranscriptionsState } from "./transcriptions.state";
import { INITIAL_UPDATER_STATE, UpdaterState } from "./updater.state";

export type SnackbarMode = "info" | "success" | "error";

export type PriceValue = HandlerOutput<"stripe/getPrices">["prices"];

export type AppState = {
  initialized: boolean;
  auth: Nullable<AuthUser>;
  keysHeld: string[];
  isRecordingHotkey: boolean;
  overlayPhase: OverlayPhase;
  audioLevels: number[];
  permissions: PermissionMap;

  memberById: Record<string, Member>;
  userById: Record<string, User>;
  userPreferencesById: Record<string, UserPreferences>;
  termById: Record<string, Term>;
  transcriptionById: Record<string, Transcription>;
  hotkeyById: Record<string, Hotkey>;
  apiKeyById: Record<string, ApiKey>;
  toneById: Record<string, Tone>;
  config: Nullable<FullConfig>;
  priceValueByKey: Record<string, PriceValue>;

  onboarding: OnboardingState;
  transcriptions: TranscriptionsState;
  dictionary: DictionaryState;
  tones: TonesState;
  settings: SettingsState;
  updater: UpdaterState;
  payment: PaymentState;
  pricing: PricingState;
  login: LoginState;

  snackbarMessage?: string;
  snackbarCounter: number;
  snackbarMode: SnackbarMode;
  snackbarDuration: number;
  snackbarTransitionDuration?: number;
};

export const INITIAL_APP_STATE: AppState = {
  isRecordingHotkey: false,
  memberById: {},
  userById: {},
  userPreferencesById: {},
  termById: {},
  transcriptionById: {},
  priceValueByKey: {},
  apiKeyById: {},
  toneById: {},
  overlayPhase: "idle",
  audioLevels: [],
  permissions: {
    microphone: null,
    accessibility: null,
  },
  hotkeyById: {},
  auth: null,
  config: null,
  keysHeld: [],
  initialized: false,
  snackbarCounter: 0,
  snackbarMode: "info",
  snackbarDuration: 3000,
  snackbarTransitionDuration: undefined,
  onboarding: INITIAL_ONBOARDING_STATE,
  transcriptions: INITIAL_TRANSCRIPTIONS_STATE,
  dictionary: INITIAL_DICTIONARY_STATE,
  tones: INITIAL_TONES_STATE,
  settings: INITIAL_SETTINGS_STATE,
  updater: INITIAL_UPDATER_STATE,
  payment: INITIAL_PAYMENT_STATE,
  pricing: INITIAL_PRICING_STATE,
  login: INITIAL_LOGIN_STATE,
};
