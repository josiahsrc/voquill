import { Nullable } from "@repo/types";
import { getIsDevMode } from "../utils/env.utils";
import { PricingPlan } from "../utils/price.utils";

export type OnboardingPageKey =
  | "signIn"
  | "chooseTranscription"
  | "chooseLlm"
  | "userDetails"
  | "micPerms"
  | "a11yPerms"
  | "keybindings"
  | "micCheck"
  | "unlockedPro"
  | "tutorial";

export type OnboardingState = {
  name: string;
  title: string;
  currentPage: OnboardingPageKey;
  history: OnboardingPageKey[];
  submitting: boolean;
  tryItOutInput: string;
  selectedPlan: PricingPlan | null;
  loggingIn: boolean;
  preferredMicrophone: Nullable<string>;
  isEnterprise: boolean;
  company: string;
  isMac: boolean;
  didSignUpWithAccount: boolean;
  dictationOverrideEnabled: boolean;
};

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  name: "",
  title: "",
  currentPage: "signIn",
  history: [],
  submitting: false,
  tryItOutInput: "",
  selectedPlan: null,
  loggingIn: false,
  preferredMicrophone: null,
  isEnterprise: false,
  company: "",
  isMac: false,
  didSignUpWithAccount: false,
  dictationOverrideEnabled: false,
};

if (getIsDevMode()) {
  INITIAL_ONBOARDING_STATE.name = "Emulator User";
}
