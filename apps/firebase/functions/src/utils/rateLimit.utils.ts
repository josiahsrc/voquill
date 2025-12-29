import * as admin from "firebase-admin";
import { AuthData } from "firebase-functions/tasks";
import { ClientError } from "./error.utils";
import { getDatabaseUrl } from "./env.utils";

export const consumeRateLimit = async (args: {
	limit: number;
	auth: AuthData;
}): Promise<void> => {
  console.log(getDatabaseUrl(), "DB URL");
	const ref = admin.database().ref(`limits/${args.auth.uid}`);

	let didExceed = false;
	await ref.transaction((current) => {
		const count = typeof current === "number" ? current : 0;
		if (count >= args.limit) {
			didExceed = true;
			return;
		}
		console.log("counting", args.auth.uid, count + 1, "of", args.limit);
		return count + 1;
	});

	if (didExceed) {
		console.log("rate limit exceeded for user", args.auth.uid);
		await admin.auth().updateUser(args.auth.uid, { disabled: true });
		await admin.auth().revokeRefreshTokens(args.auth.uid);
		throw new ClientError("Rate limit exceeded; Please contact support.");
	}
};
