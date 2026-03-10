"use client";

import { useMemo, type ReactNode } from "react";
import { IntlProvider } from "react-intl";
import mixpanel from "mixpanel-browser";
import { getIntlConfig } from "./i18n";

const mixpanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
if (typeof window !== "undefined" && mixpanelToken) {
  mixpanel.init(mixpanelToken, {
    debug: process.env.NODE_ENV === "development",
    track_pageview: true,
    persistence: "localStorage",
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const intlConfig = useMemo(() => getIntlConfig(), []);

  return <IntlProvider {...intlConfig}>{children}</IntlProvider>;
}
