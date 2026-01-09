import mixpanel from "mixpanel-browser";

export function trackPageView(pageName: string) {
  mixpanel.track("Page View", { page: pageName });
}

export function trackButtonClick(name: string) {
  mixpanel.track("Button Click", { name });
}
