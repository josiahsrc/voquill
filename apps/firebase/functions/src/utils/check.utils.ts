import { Nullable } from "@repo/types";
import { AuthData } from "firebase-functions/tasks";
import { UnauthenticatedError } from "./error.utils";
import { consumeRateLimit } from "./rateLimit.utils";

function requireAuth(auth: Nullable<AuthData>): asserts auth is AuthData {
  if (!auth) {
    throw new UnauthenticatedError("you must be signed in");
  }
}

async function requireSubscription(auth: Nullable<AuthData>): Promise<void> {
  requireAuth(auth);
  // TODO
  // const isSubscribed = auth.token?.subscribed === true;
  // if (!isSubscribed) {
  //   throw new ClientError("you must have an active subscription to perform this action");
  // }
}

export type PaidAccessOutput = {
  auth: AuthData;
}

export const checkPaidAccess = async (auth: Nullable<AuthData>): Promise<PaidAccessOutput> => {
  requireAuth(auth);
  await requireSubscription(auth);
  await consumeRateLimit({
    limit: 50_000,
    auth: auth,
  });
  return { auth };
}
