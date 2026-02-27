import crypto from "crypto";
import { HandlerInput, HandlerOutput } from "@repo/functions";
import { Nullable } from "@repo/types";
import * as admin from "firebase-admin";
import { AuthData } from "firebase-functions/tasks";
import { checkAccess } from "../utils/check.utils";
import { NotFoundError } from "../utils/error.utils";

function hashToken(raw: string): string {
	return crypto.createHash("sha256").update(raw).digest("hex");
}

export const createApiToken = async (args: {
	auth: Nullable<AuthData>;
}): Promise<HandlerOutput<"auth/createApiToken">> => {
	const access = await checkAccess(args.auth);
	const uid = access.auth.uid;

	const rawToken = crypto.randomBytes(32).toString("hex");
	const tokenHash = hashToken(rawToken);

	await admin
		.database()
		.ref(`apiRefreshTokens/${tokenHash}`)
		.set({ uid, createdAt: Date.now() });

	const apiToken = await admin.auth().createCustomToken(uid);

	return { apiToken, apiRefreshToken: rawToken };
};

export const refreshApiToken = async (args: {
	input: HandlerInput<"auth/refreshApiToken">;
}): Promise<HandlerOutput<"auth/refreshApiToken">> => {
	const tokenHash = hashToken(args.input.apiRefreshToken);
	const snapshot = await admin
		.database()
		.ref(`apiRefreshTokens/${tokenHash}`)
		.get();

	const data = snapshot.val();
	if (!data) {
		throw new NotFoundError("invalid refresh token");
	}

	const apiToken = await admin.auth().createCustomToken(data.uid);
	return { apiToken };
};
