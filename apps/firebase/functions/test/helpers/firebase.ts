import * as admin from "firebase-admin";
import * as adminFirestore from "firebase-admin/firestore";
import { getApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  terminate,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { nanoid } from "nanoid";
import {
  getClientFirebaseAuthEmulatorUrl,
  getClientFirestoreHost,
  getClientFunctionsHost,
  getClientStorageHost,
  getEmulatorDatabaseUrl,
  getFirebaseAuthEmulatorHost,
  getFirebaseFunctionsEndpoint,
  getFirestoreEmulatorHost,
  getGcloudProject,
  getRealtimeDatabaseEmulatorHost,
  getShowWarnings,
} from "./env";

export async function initializeFirebase() {
  process.env.FIRESTORE_EMULATOR_HOST = getFirestoreEmulatorHost();
  process.env.FIREBASE_AUTH_EMULATOR_HOST = getFirebaseAuthEmulatorHost();
  process.env.GCLOUD_PROJECT = getGcloudProject();
  process.env.REALTIME_DATABASE_EMULATOR_HOST = getRealtimeDatabaseEmulatorHost();

  admin.initializeApp({
    databaseURL: getEmulatorDatabaseUrl(),
  });
  adminFirestore.getFirestore().settings({ ignoreUndefinedProperties: true });

  // enable warnings if the SHOW_WARNINGS env variable is set
  if (!getShowWarnings()) {
    const originalWarn = console.warn;
    console.warn = (message: string): void => {
      if (message.includes("@firebase/firestore")) {
        return;
      }
      originalWarn(message);
    };
  }

  const app = initializeApp({
    apiKey: "AIzaSyCJ8C3ZW2bHjerneg5i0fr-b5uwuy7uULM",
    authDomain: "voquill-dev.firebaseapp.com",
    projectId: "voquill-dev",
    storageBucket: "voquill-dev.firebasestorage.app",
    messagingSenderId: "778214168359",
    appId: "1:778214168359:web:66ee2ce5df76c8c2d77b02",
    measurementId: "G-V6Y1RSFBQX"
  });
  initializeFirestore(getApp(), { ignoreUndefinedProperties: true });

  const auth = getAuth(app);
  connectAuthEmulator(auth, getClientFirebaseAuthEmulatorUrl(), {
    disableWarnings: !getShowWarnings(),
  });

  const firestore = getFirestore(app);
  const firestoreParts = getClientFirestoreHost().split(":");
  connectFirestoreEmulator(
    firestore,
    firestoreParts[0] ?? "",
    parseInt(firestoreParts[1] ?? "")
  );

  const functions = getFunctions(app);
  const functionsParts = getClientFunctionsHost().split(":");
  connectFunctionsEmulator(
    functions,
    functionsParts[0] ?? "",
    parseInt(functionsParts[1] ?? "")
  );

  const storage = getStorage(app);
  const storageParts = getClientStorageHost().split(":");
  connectStorageEmulator(storage, storageParts[0] ?? "", parseInt(storageParts[1] ?? ""));

  const rtdb = getDatabase(app);
  const rtdbParts = getRealtimeDatabaseEmulatorHost().split(":");
  connectDatabaseEmulator(
    rtdb,
    rtdbParts[0] ?? "",
    parseInt(rtdbParts[1] ?? "")
  );
}

export async function closeFirebase() {
  await admin.firestore().terminate();
  await admin.app().delete();
  await terminate(getFirestore());
}

export type UserCreds = {
  id: string;
  email: string;
  password: string;
};

export async function createUserCreds(opts?: {
  email?: string;
  firstName?: string;
  lastName?: string;
}): Promise<UserCreds> {
  const email = opts?.email ?? `test-${nanoid().toLowerCase()}@example.com`;
  const password = "password";

  const auth = getAuth();
  const user = await createUserWithEmailAndPassword(auth, email, password);

  return {
    id: user.user.uid,
    email,
    password,
  };
}

export async function signInWithCreds(creds: UserCreds) {
  const auth = getAuth();
  await signInWithEmailAndPassword(auth, creds.email, creds.password);
  if (!auth.currentUser) {
    throw new Error("User not signed in");
  }

  return auth.currentUser;
}

export async function signOutUser() {
  const auth = getAuth();
  await signOut(auth);
}

export async function callFunctionHttp<I, O>(
  name: string,
  data: I
): Promise<O> {
  const url = `${getFirebaseFunctionsEndpoint()}/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export const deleteMyUser = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    await user.delete();
  }
};
