import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { IntlProvider } from "react-intl";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { SnackbarEmitter } from "./components/root/SnackbarEmitter";
import { getIntlConfig } from "./i18n";
import { theme } from "./theme";
import App from "./App";

function Root() {
  const intlConfig = useMemo(() => getIntlConfig(), []);

  return (
    <React.StrictMode>
      <IntlProvider {...intlConfig}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SnackbarEmitter />
          <App />
        </ThemeProvider>
      </IntlProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
