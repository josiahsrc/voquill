import * as env from "env-var";

const getOptionalString = (varName: string): string | undefined => {
  const value = env.get(varName).asString();
  return value === "empty" ? undefined : value;
}

export const PROJECT_DISPLAY_NAME_VAR = "PROJECT_DISPLAY_NAME";
export const getProjectDisplayName = () =>
  env.get(PROJECT_DISPLAY_NAME_VAR).required().asString();

export const PROJECT_ID_VAR = "PROJECT_ID";
export const getProjectId = () => env.get(PROJECT_ID_VAR).required().asString();

export const FUNCTIONS_ENDPOINT_VAR = "FUNCTIONS_ENDPOINT";
export const getFunctionsEndpoint = () =>
  env.get(FUNCTIONS_ENDPOINT_VAR).required().asString();

export const EMULATED_VAR = "EMULATED";
export const isEmulated = () => env.get(EMULATED_VAR).default("false").asBool();
export const isNotEmulated = () => !isEmulated();

export type Flavor = "dev" | "prod" | "emulators";
export const FLAVOR_VAR = "FLAVOR";
export const getFlavor = () =>
  env.get(FLAVOR_VAR).required().asString() as Flavor;

export const STORAGE_BUCKET_VAR = "STORAGE_BUCKET";
export const getStorageBucket = () => env.get(STORAGE_BUCKET_VAR).asString();

export const GROQ_API_KEY_VAR = "GROQ_API_KEY";
export const getGroqApiKey = () =>
  env.get(GROQ_API_KEY_VAR).required().asString();

export const STRIPE_SECRET_KEY_VAR = "STRIPE_SECRET_KEY";
export const getStripeSecretKey = () =>
  env.get(STRIPE_SECRET_KEY_VAR).required().asString();

export const STRIPE_WEBHOOK_SECRET_VAR = "STRIPE_WEBHOOK_SECRET";
export const getStripeWebhookSecret = () =>
  env.get(STRIPE_WEBHOOK_SECRET_VAR).required().asString();

export const LOOPS_API_KEY_VAR = "LOOPS_API_KEY";
export const getLoopsApiKey = () => getOptionalString(LOOPS_API_KEY_VAR);

export const DATABASE_URL_VAR = "DATABASE_URL";
export const getDatabaseUrl = () => env.get(DATABASE_URL_VAR).asString();
