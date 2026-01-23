import mixpanel from "mixpanel-browser";

export const CURRENT_COHORT = "2025-01-b";

export function trackPageView(pageName: string) {
  mixpanel.track("Page View", { page: pageName });
}

export function trackOnboardingStep(step: string) {
  mixpanel.track("Onboarding Step", { step });
}

export function trackDictationStart() {
  mixpanel.track("Activate Dictation Mode");
}

export function trackAgentStart() {
  mixpanel.track("Activate Agent Mode");
}

export function trackPaymentComplete() {
  mixpanel.track("Payment Complete");
}

export function trackButtonClick(
  name: string,
  props?: Record<string, unknown>,
) {
  mixpanel.track("Button Click", { name, ...props });
}

export function trackAppUsed(appName: string) {
  mixpanel.track("App Used", { appName });
}
