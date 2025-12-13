import { Nullable } from "@repo/types";
import { EffectivePlan } from "../types/member.types";
import { getIsDevMode } from "../utils/env.utils";

export type OnboardingPageKey =
  | "welcome"
  | "name"
  | "plan"
  | "login"
  | "transcription"
  | "postProcessing"
  | "hotkeys"
  | "microphone";

export type OnboardingState = {
  name: string;
  currentPage: OnboardingPageKey;
  history: OnboardingPageKey[];
  submitting: boolean;
  tryItOutInput: string;
  selectedPlan: EffectivePlan | null;
  loggingIn: boolean;
  preferredMicrophone: Nullable<string>;
};

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  name: "",
  currentPage: "welcome",
  history: [],
  submitting: false,
  tryItOutInput: "",
  selectedPlan: null,
  loggingIn: false,
  preferredMicrophone: null,
};

if (getIsDevMode()) {
  INITIAL_ONBOARDING_STATE.name = "Emulator User";
}
