import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { IntlProvider } from "react-intl";
import App from "./App";
import { getIntlConfig } from "./i18n";
import "./styles/global.css";

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
