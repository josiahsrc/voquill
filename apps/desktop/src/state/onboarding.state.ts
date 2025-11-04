import { MemberPlan } from "@repo/types";
import { getIsDevMode } from "../utils/env.utils";

export type OnboardingPageKey =
  | "welcome"
  | "name"
  | "plan"
  | "login"
  | "transcription"
  | "postProcessing"
  | "hotkeys"
  | "tryItOut";

export type OnboardingState = {
  name: string;
  currentPage: OnboardingPageKey;
  history: OnboardingPageKey[];
  submitting: boolean;
  tryItOutInput: string;
  selectedPlan: MemberPlan | null;
  loggingIn: boolean;
};

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  name: "",
  currentPage: "welcome",
  history: [],
  submitting: false,
  tryItOutInput: "",
  selectedPlan: null,
  loggingIn: false,
};

if (getIsDevMode()) {
  INITIAL_ONBOARDING_STATE.name = "Emulator User";
}
