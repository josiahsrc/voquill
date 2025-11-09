import * as admin from "firebase-admin";
import { AuthData } from "firebase-functions/tasks";
import { ClientError } from "./error.utils";

export const consumeRateLimit = async (args: {
  limit: number,
  auth: AuthData
}): Promise<void> => {
  const ref = admin.database().ref(`limits/${args.auth.uid}`);

  let didExceed = false;
  await ref.transaction(
    (current) => {
      const count = typeof current === "number" ? current : 0;
      if (count >= args.limit) {
        didExceed = true;
        return;
      }
      return count + 1;
    },
  );

  if (didExceed) {
    await admin.auth().updateUser(args.auth.uid, { disabled: true });
    await admin.auth().revokeRefreshTokens(args.auth.uid);
    throw new ClientError('Rate limit exceeded; Please contact support.');
  }
}