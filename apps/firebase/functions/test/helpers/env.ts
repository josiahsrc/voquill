import * as env from "env-var";

export const getFirestoreEmulatorHost = () =>
  env.get("FIRESTORE_EMULATOR_HOST").default("localhost:8080").asString();

export const getFirebaseAuthEmulatorHost = () =>
  env.get("FIREBASE_AUTH_EMULATOR_HOST").default("localhost:9099").asString();

export const getClientFirebaseAuthEmulatorUrl = () =>
  env
    .get("CLIENT_FIREBASE_AUTH_EMULATOR_URL")
    .default("http://127.0.0.1:9099")
    .asString();

export const getClientFirestoreHost = () =>
  env.get("CLIENT_FIRESTORE_HOST").default("localhost:8080").asString();

export const getRealtimeDatabaseEmulatorHost = () =>
  env.get("REALTIME_DATABASE_EMULATOR_HOST").default("localhost:9000").asString();

export const getClientFunctionsHost = () =>
  env.get("CLIENT_FUNCTIONS_HOST").default("127.0.0.1:5001").asString();

export const getClientStorageHost = () =>
  env.get("CLIENT_STORAGE_HOST").default("127.0.0.1:9199").asString();

export const getGcloudProject = () =>
  env.get("GCLOUD_PROJECT").default("voquill-dev").asString();

export const getShowWarnings = () =>
  env.get("SHOW_WARNINGS").default("false").asBool();

export const getFirebaseFunctionsEndpoint = () =>
  env
    .get("FIREBASE_FUNCTIONS_ENDPOINT")
    .default(`http://localhost:5001/${getGcloudProject()}/us-central1`)
    .asString();

export const getEmulatorDatabaseUrl = () => env.get("EMULATOR_DATABASE_URL").default(`http://${getRealtimeDatabaseEmulatorHost()}/?ns=${getGcloudProject()}-default-rtdb`).asString();
