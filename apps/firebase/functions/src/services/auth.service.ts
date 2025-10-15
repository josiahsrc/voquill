import * as admin from "firebase-admin";
import { AuthData } from "firebase-functions/tasks";
import { HandlerInput, HandlerOutput } from "@repo/functions";
import { blaze, DeleteAccountAction, Nullable, path } from "../shared";
import { cancelAccountDeletionForUserId } from "../utils/auth.utils";
import { UnauthenticatedError } from "../utils/error.utils";
import { sendLoopsEvent } from "../utils/loops.utils";
import dayjs from "dayjs";

export const createCustomToken = async (args: {
	auth: Nullable<AuthData>;
	input: HandlerInput<"auth/createCustomToken">;
}): Promise<HandlerOutput<"auth/createCustomToken">> => {
	if (!args.auth) {
		console.log("missing auth data");
		throw new UnauthenticatedError("You must be authenticated");
	}

	const { uid } = args.auth;
	const user = await admin.auth().getUser(uid);
	if (!user) {
		console.log("no refresh token provided");
		throw new UnauthenticatedError("User not found");
	}

	console.log("creating custom token for user:", uid);
	const customToken = await admin.auth().createCustomToken(uid);

	return {
		customToken,
	};
};

export const cancelAccountDeletion = async (args: {
	auth: Nullable<AuthData>;
}): Promise<HandlerOutput<"auth/cancelAccountDeletion">> => {
	if (!args.auth) {
		console.log("missing auth data");
		throw new UnauthenticatedError("You must be authenticated");
	}

	await cancelAccountDeletionForUserId({
		userId: args.auth.uid,
	});

	return {};
};

export const enqueueAccountDeletion = async (args: {
	auth: Nullable<AuthData>;
}): Promise<HandlerOutput<"auth/deleteMyAccount">> => {
	if (!args.auth) {
		console.log("missing auth data");
		throw new UnauthenticatedError("You must be authenticated");
	}

	await cancelAccountDeletionForUserId({
		userId: args.auth.uid,
	});

	const oneMonthFromNow = dayjs().add(30, "day").toDate();

	const entry: DeleteAccountAction = {
		id: args.auth.uid,
		createdAt: blaze().now(),
		createdByUserId: args.auth.uid,
		type: "deleteAccount",
		userId: args.auth.uid,
		runAfterTimestamp: blaze().timestampFromDate(oneMonthFromNow),
		status: "pending",
	};

	await blaze().set(path.delayedActions(args.auth.uid), entry);
	await sendLoopsEvent({
		userId: args.auth.uid,
		eventName: "account-deletion-started",
	});

	return {};
};
