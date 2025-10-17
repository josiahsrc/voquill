import { Member, Nullable, PartialConfig, Transcription, User } from "@repo/types";
import {
  INITIAL_ONBOARDING_STATE,
  type OnboardingState,
} from "./onboarding.state";
import { INITIAL_TRANSCRIPTIONS_STATE, TranscriptionsState } from "./transcriptions.state";

export type SnackbarMode = "info" | "success" | "error";

export type AppState = {
  initialized: boolean;
  currentUserId: Nullable<string>;

  memberById: Record<string, Member>;
  userById: Record<string, User>;
  transcriptionById: Record<string, Transcription>;
  config: Nullable<PartialConfig>;

  onboarding: OnboardingState;
  transcriptions: TranscriptionsState;

  snackbarMessage?: string;
  snackbarCounter: number;
  snackbarMode: SnackbarMode;
  snackbarDuration: number;
  snackbarTransitionDuration?: number;
};

export const INITIAL_APP_STATE: AppState = {
  memberById: {},
  userById: {},
  transcriptionById: {},
  currentUserId: null,
  config: null,
  initialized: false,
  snackbarCounter: 0,
  snackbarMode: "info",
  snackbarDuration: 3000,
  snackbarTransitionDuration: undefined,
  onboarding: INITIAL_ONBOARDING_STATE,
  transcriptions: INITIAL_TRANSCRIPTIONS_STATE,
};
