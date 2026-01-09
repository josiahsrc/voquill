import mixpanel from "mixpanel-browser";

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
