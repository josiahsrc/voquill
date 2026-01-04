import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { FirebaseOptions, initializeApp } from "firebase/app";
import { connectAuthEmulator } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { IntlProvider } from "react-intl";
import { OverlayRoot } from "./components/overlay/OverlayRoot";
import { AppWithLoading } from "./components/root/AppWithLoading";
import { SnackbarEmitter } from "./components/root/SnackbarEmitter";
import { ToastRoot } from "./components/toast";
import { getIntlConfig } from "./i18n";
import { theme } from "./theme";
import { createEffectiveAuth } from "./utils/auth.utils";
import { getIsEmulators, getStripePublicKey } from "./utils/env.utils";

const firebaseConfig: FirebaseOptions = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyCJ8C3ZW2bHjerneg5i0fr-b5uwuy7uULM",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "voquill-dev.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "voquill-dev",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "voquill-dev.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "778214168359",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:778214168359:web:66ee2ce5df76c8c2d77b02",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-V6Y1RSFBQX",
};

const missingFirebaseConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfigKeys.length > 0) {
  throw new Error(
    `Missing Firebase configuration values: ${missingFirebaseConfigKeys.join(", ")}`,
  );
}

const app = initializeApp(firebaseConfig);

initializeFirestore(app, { ignoreUndefinedProperties: true });

const auth = createEffectiveAuth(app);
if (getIsEmulators()) {
  connectAuthEmulator(auth, `http://localhost:9099`);
}

const firestore = getFirestore(app);
if (getIsEmulators()) {
  connectFirestoreEmulator(firestore, "localhost", 8760);
}

const functions = getFunctions(app);
if (getIsEmulators()) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

const storage = getStorage(app);
if (getIsEmulators()) {
  connectStorageEmulator(storage, "localhost", 9199);
}

const searchParams =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;

const isOverlayWindow = searchParams?.get("overlay") === "1";
const isToastWindow = searchParams?.get("toast") === "1";

const rootElement = document.getElementById("root") as HTMLElement;

// Prevent HMR from creating multiple React roots.
// Store the root on the DOM element so we can reuse it across hot reloads.
const existingRoot = (rootElement as unknown as { _reactRoot?: ReactDOM.Root })
  ._reactRoot;
const root = existingRoot ?? ReactDOM.createRoot(rootElement);
(rootElement as unknown as { _reactRoot?: ReactDOM.Root })._reactRoot = root;

type ChildrenProps = {
  children: React.ReactNode;
};

const Main = ({ children }: ChildrenProps) => {
  const intlConfig = useMemo(() => getIntlConfig(), []);

  return (
    <React.StrictMode>
      <IntlProvider {...intlConfig}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </IntlProvider>
    </React.StrictMode>
  );
};

if (isOverlayWindow) {
  root.render(
    <Main>
      <OverlayRoot />
    </Main>,
  );
} else if (isToastWindow) {
  root.render(
    <Main>
      <ToastRoot />
    </Main>,
  );
} else {
  const stripePromise = loadStripe(getStripePublicKey());
  root.render(
    <Main>
      <Elements stripe={stripePromise}>
        <SnackbarEmitter />
        <AppWithLoading />
      </Elements>
    </Main>,
  );
}
