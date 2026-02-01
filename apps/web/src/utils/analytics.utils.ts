import mixpanel from "mixpanel-browser";

export function getMixpanel() {
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

export function trackButtonClick(name: string) {
  getMixpanel()?.track("Button Click", { name });
}
