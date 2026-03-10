import mixpanel from "mixpanel-browser";

export function getMixpanel() {
  const mixpanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!mixpanelToken) {
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
