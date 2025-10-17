import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import ReactDOM from "react-dom/client";
import React from "react";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme";
import { SnackbarEmitter } from "./components/root/SnackbarEmitter";
import { AppWithLoading } from "./components/root/AppWithLoading";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <SnackbarEmitter />
      <CssBaseline />
      <AppWithLoading />
    </ThemeProvider>
  </React.StrictMode>
);
