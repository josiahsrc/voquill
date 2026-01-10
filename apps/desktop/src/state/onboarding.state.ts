import { Nullable } from "@repo/types";
import { getIsDevMode } from "../utils/env.utils";
import { PricingPlan } from "../utils/price.utils";

export type OnboardingPageKey =
  | "welcome"
  | "name"
  | "plan"
  | "login"
  | "transcription"
  | "postProcessing"
  | "agentMode"
  | "agentHotkey"
  | "hotkeys"
  | "microphone";

export type OnboardingState = {
  name: string;
  currentPage: OnboardingPageKey;
  history: OnboardingPageKey[];
  submitting: boolean;
  tryItOutInput: string;
  selectedPlan: PricingPlan | null;
  loggingIn: boolean;
  preferredMicrophone: Nullable<string>;
  isEnterprise: boolean;
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
  isEnterprise: false,
};

if (getIsDevMode()) {
  INITIAL_ONBOARDING_STATE.name = "Emulator User";
}
