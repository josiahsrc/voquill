import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { FirebaseOptions, initializeApp } from "firebase/app";
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
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

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
    `Missing Firebase configuration values: ${missingFirebaseConfigKeys.join(", ")}`
  );
}

const app = initializeApp(firebaseConfig);

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
  let content = (
    <Refresher>
      <SnackbarEmitter />
      <AppWithLoading />
    </Refresher>
  );

  const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  if (stripePublicKey) {
    const stripePromise = loadStripe(stripePublicKey);
    content = <Elements stripe={stripePromise}>{content}</Elements>;
  }

  root.render(<Main>{content}</Main>);
}
