import { Nullable } from "@repo/types";
import { AuthData } from "firebase-functions/tasks";
import { UnauthenticatedError } from "./error.utils";
import { consumeRateLimit } from "./rateLimit.utils";

function requireAuth(auth: Nullable<AuthData>): asserts auth is AuthData {
  if (!auth) {
    throw new UnauthenticatedError("you must be signed in");
  }
}

export type AccessOutput = {
  auth: AuthData;
}

export const checkAccess = async (auth: Nullable<AuthData>): Promise<AccessOutput> => {
  requireAuth(auth);
  await consumeRateLimit({
    limit: 50_000,
    auth: auth,
  });
  return { auth };
}
