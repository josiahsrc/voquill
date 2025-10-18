import { Hotkey, Member, Nullable, PartialConfig, Term, Transcription, User } from "@repo/types";
import { INITIAL_ONBOARDING_STATE, type OnboardingState } from "./onboarding.state";
import { INITIAL_TRANSCRIPTIONS_STATE, TranscriptionsState } from "./transcriptions.state";
import { DictionaryState, INITIAL_DICTIONARY_STATE } from "./dictionary.state";
import { INITIAL_SETTINGS_STATE, SettingsState } from "./settings.state";

export type SnackbarMode = "info" | "success" | "error";

export type AppState = {
  initialized: boolean;
  currentUserId: Nullable<string>;
  keysHeld: string[];
  isRecordingHotkey: boolean;

  memberById: Record<string, Member>;
  userById: Record<string, User>;
  termById: Record<string, Term>;
  transcriptionById: Record<string, Transcription>;
  hotkeyById: Record<string, Hotkey>;
  config: Nullable<PartialConfig>;

  onboarding: OnboardingState;
  transcriptions: TranscriptionsState;
  dictionary: DictionaryState;
  settings: SettingsState;

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
  termById: {},
  transcriptionById: {},
  hotkeyById: {},
  currentUserId: null,
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
  settings: INITIAL_SETTINGS_STATE,
};
