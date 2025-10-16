import { Member, Nullable, PartialConfig, User } from "@repo/types";
import {
  INITIAL_ONBOARDING_STATE,
  type OnboardingState,
} from "./onboarding.state";

export type SnackbarMode = "info" | "success" | "error";

export type AppState = {
  initialized: boolean;
  currentUserId: Nullable<string>;

  memberById: Record<string, Member>;
  userById: Record<string, User>;
  config: Nullable<PartialConfig>;

  onboarding: OnboardingState;

  snackbarMessage?: string;
  snackbarCounter: number;
  snackbarMode: SnackbarMode;
  snackbarDuration: number;
  snackbarTransitionDuration?: number;
};

export const INITIAL_APP_STATE: AppState = {
  memberById: {},
  userById: {},
  currentUserId: null,
  config: null,
  initialized: false,
  snackbarCounter: 0,
  snackbarMode: "info",
  snackbarDuration: 3000,
  snackbarTransitionDuration: undefined,
  onboarding: INITIAL_ONBOARDING_STATE,
};
