import mixpanel from "mixpanel-browser";
import { getIsEnterpriseEnabled } from "./enterprise.utils";

export const CURRENT_COHORT = "2025-01-b";

export function getMixpanel() {
  if (getIsEnterpriseEnabled()) {
    // Disable Mixpanel for Enterprise users
    return null;
  }

  const mixpanelToken = import.meta.env.VITE_MIXPANEL_TOKEN;
  if (!mixpanelToken) {
    // Mixpanel token is not set, do not initialize Mixpanel
    return null;
  }

  return mixpanel;
}

export function trackPageView(pageName: string) {
  getMixpanel()?.track("Page View", { page: pageName });
}

export function trackOnboardingStep(step: string) {
  getMixpanel()?.track("Onboarding Step", { step });
}

export function trackDictationStart() {
  getMixpanel()?.track("Activate Dictation Mode");
}

export function trackAgentStart() {
  getMixpanel()?.track("Activate Agent Mode");
}

export function trackPaymentComplete() {
  getMixpanel()?.track("Payment Complete");
}

export function trackButtonClick(
  name: string,
  props?: Record<string, unknown>,
) {
  getMixpanel()?.track("Button Click", { name, ...props });
}

export function trackAppUsed(appName: string) {
  getMixpanel()?.track("App Used", { appName });
}
