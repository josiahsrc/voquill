import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { IntlProvider } from "react-intl";
import mixpanel from "mixpanel-browser";
import App from "./App";
import { getIntlConfig } from "./i18n";
import "./styles/global.css";

const mixpanelToken = import.meta.env.VITE_MIXPANEL_TOKEN;
if (mixpanelToken) {
  mixpanel.init(mixpanelToken, {
    debug: import.meta.env.DEV,
    track_pageview: true,
    persistence: "localStorage",
  });
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("Failed to find the root element");
}

const RootApp = () => {
  const intlConfig = useMemo(() => getIntlConfig(), []);
  return (
    <StrictMode>
      <IntlProvider {...intlConfig}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </IntlProvider>
    </StrictMode>
  );
};

createRoot(container).render(<RootApp />);
