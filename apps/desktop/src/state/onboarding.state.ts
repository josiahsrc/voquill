import { getIsDevMode } from "../utils/env.utils";

export type OnboardingState = {
  name: string;
  page: number;
  submitting: boolean;
};

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  name: "",
  page: 0,
  submitting: false,
};

if (getIsDevMode()) {
  INITIAL_ONBOARDING_STATE.name = "Emulator User";
}
