import { HandlerOutput } from "@repo/functions";
import {
  ApiKey,
  AppTarget,
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
import { Toast } from "../types/toast.types";
import { AgentState, INITIAL_AGENT_STATE } from "./agent.state";
import { DictionaryState, INITIAL_DICTIONARY_STATE } from "./dictionary.state";
import { INITIAL_LOGIN_STATE, LoginState } from "./login.state";
import {
  INITIAL_ONBOARDING_STATE,
  type OnboardingState,
} from "./onboarding.state";
import { INITIAL_PAYMENT_STATE, PaymentState } from "./payment.state";
import { INITIAL_PRICING_STATE, PricingState } from "./pricing.state";
import { INITIAL_SETTINGS_STATE, SettingsState } from "./settings.state";
import {
  INITIAL_TONE_EDITOR_STATE,
  ToneEditorState,
} from "./tone-editor.state";
import { INITIAL_TONES_STATE, TonesState } from "./tones.state";
import {
  INITIAL_TRANSCRIPTIONS_STATE,
  TranscriptionsState,
} from "./transcriptions.state";
import { INITIAL_TUTORIAL_STATE, TutorialState } from "./tutorial.state";
import { INITIAL_UPDATER_STATE, UpdaterState } from "./updater.state";

export type SnackbarMode = "info" | "success" | "error";

export type RecordingMode = "dictate" | "agent";

export type PriceValue = HandlerOutput<"stripe/getPrices">["prices"];

export type AppState = {
  initialized: boolean;
  auth: Nullable<AuthUser>;
  keysHeld: string[];
  isRecordingHotkey: boolean;
  activeRecordingMode: Nullable<RecordingMode>;
  overlayPhase: OverlayPhase;
  audioLevels: number[];
  permissions: PermissionMap;
  confettiCounter: number;
  userPrefs: Nullable<UserPreferences>;

  memberById: Record<string, Member>;
  userById: Record<string, User>;
  termById: Record<string, Term>;
  appTargetById: Record<string, AppTarget>;
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
  toneEditor: ToneEditorState;
  settings: SettingsState;
  updater: UpdaterState;
  payment: PaymentState;
  pricing: PricingState;
  login: LoginState;
  tutorial: TutorialState;
  agent: AgentState;

  snackbarMessage?: string;
  snackbarCounter: number;
  snackbarMode: SnackbarMode;
  snackbarDuration: number;
  snackbarTransitionDuration?: number;

  toastQueue: Toast[];
  currentToast: Toast | null;
};

export const INITIAL_APP_STATE: AppState = {
  userPrefs: null,
  isRecordingHotkey: false,
  activeRecordingMode: null,
  memberById: {},
  userById: {},
  termById: {},
  appTargetById: {},
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
  confettiCounter: 0,
  config: null,
  keysHeld: [],
  initialized: false,
  snackbarCounter: 0,
  snackbarMode: "info",
  snackbarDuration: 3000,
  snackbarTransitionDuration: undefined,
  toastQueue: [],
  currentToast: null,
  agent: INITIAL_AGENT_STATE,
  onboarding: INITIAL_ONBOARDING_STATE,
  transcriptions: INITIAL_TRANSCRIPTIONS_STATE,
  dictionary: INITIAL_DICTIONARY_STATE,
  tones: INITIAL_TONES_STATE,
  toneEditor: INITIAL_TONE_EDITOR_STATE,
  settings: INITIAL_SETTINGS_STATE,
  updater: INITIAL_UPDATER_STATE,
  payment: INITIAL_PAYMENT_STATE,
  pricing: INITIAL_PRICING_STATE,
  login: INITIAL_LOGIN_STATE,
  tutorial: INITIAL_TUTORIAL_STATE,
};
