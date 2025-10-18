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
import { OverlayRoot } from "./components/root/OverlayRoot";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
	connectFirestoreEmulator,
	getFirestore,
	initializeFirestore,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { getIsEmulators } from "./utils/env.utils";

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

if (isOverlayWindow) {
  root.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <OverlayRoot />
      </ThemeProvider>
    </React.StrictMode>,
  );
} else {
  root.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <SnackbarEmitter />
        <CssBaseline />
        <AppWithLoading />
      </ThemeProvider>
    </React.StrictMode>,
  );
}
