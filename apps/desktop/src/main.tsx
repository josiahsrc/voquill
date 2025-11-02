import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import React from "react";
import ReactDOM from "react-dom/client";
import { OverlayRoot } from "./components/overlay/OverlayRoot";
import { AppWithLoading } from "./components/root/AppWithLoading";
import { SnackbarEmitter } from "./components/root/SnackbarEmitter";
import { theme } from "./theme";
import { getIsDevMode, getIsEmulators } from "./utils/env.utils";
import { useKeyDownHandler } from "./hooks/helper.hooks";

const config = {
  apiKey: "AIzaSyDlPI-o5piDSNIG39EvJZJEz0gXCGEGk-w",
  authDomain: "voquill-prod.firebaseapp.com",
  projectId: "voquill-prod",
  storageBucket: "voquill-prod.firebasestorage.app",
  messagingSenderId: "777461284594",
  appId: "1:777461284594:web:d431c9557d3e02395e5a6b",
  measurementId: "G-LKHEH0DPND",
};

const app = initializeApp(config);

initializeFirestore(app, { ignoreUndefinedProperties: true });

const auth = getAuth(app);
if (getIsEmulators()) {
  connectAuthEmulator(auth, `http://localhost:9099`);
}

const firestore = getFirestore(app);
if (getIsEmulators()) {
  connectFirestoreEmulator(firestore, "localhost", 8080);
}

const functions = getFunctions(app);
if (getIsEmulators()) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

const storage = getStorage(app);
if (getIsEmulators()) {
  connectStorageEmulator(storage, "localhost", 9199);
}

const isOverlayWindow =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("overlay") === "1";

const rootElement = document.getElementById("root") as HTMLElement;
const root = ReactDOM.createRoot(rootElement);

type ChildrenProps = {
  children: React.ReactNode;
};

const Refresher = ({ children }: ChildrenProps) => {
  // You cannot refresh the page in Tauri, here's a hotkey to help with that
  useKeyDownHandler({
    keys: ["r"],
    ctrl: true,
    callback: () => {
      if (getIsDevMode()) {
        window.location.reload();
      }
    },
  });

  return <>{children}</>;
};

const Main = ({ children }: ChildrenProps) => {
  return (
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </React.StrictMode>
  );
};

if (isOverlayWindow) {
  root.render(
    <Main>
      <OverlayRoot />
    </Main>
  );
} else {
  root.render(
    <Main>
      <Refresher>
        <SnackbarEmitter />
        <AppWithLoading />
      </Refresher>
    </Main>
  );
}
