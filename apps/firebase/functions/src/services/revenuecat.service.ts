import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import * as admin from "firebase-admin";
import { tryInitializeMember } from "../utils/member.utils";

export interface RevenueCatWebhookEvent {
	type: string;
	app_user_id: string;
	[key: string]: unknown;
}

export const handleInitialPurchase = async (event: RevenueCatWebhookEvent) => {
	const userId = event.app_user_id;
	console.log("handling RevenueCat initial purchase for user", userId);

	const member = await tryInitializeMember(userId);
	if (member.plan === "pro" && !member.isOnTrial) {
		console.warn(
			"member",
			userId,
			"already has an active paid subscription, skipping upgrade",
		);
		return;
	}

	await firemix().update(mixpath.members(userId), {
		plan: "pro",
		isOnTrial: false,
		trialEndsAt: null,
		updatedAt: firemix().now(),
	});

	console.log("adding custom claims to user", userId);
	await admin.auth().setCustomUserClaims(userId, { subscribed: true });
};

export const handleExpiration = async (event: RevenueCatWebhookEvent) => {
	const userId = event.app_user_id;
	console.log("handling RevenueCat expiration for user", userId);

	await tryInitializeMember(userId);
	await firemix().update(mixpath.members(userId), {
		plan: "free",
		updatedAt: firemix().now(),
	});

	console.log("removing custom claims from user", userId);
	await admin.auth().setCustomUserClaims(userId, { subscribed: false });
};
