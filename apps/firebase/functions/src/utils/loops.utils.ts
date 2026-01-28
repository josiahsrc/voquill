import { firemix, Nullable } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { Contact } from "@repo/types";
import * as admin from "firebase-admin";
import { ContactProperties, EventProperties, LoopsClient } from "loops";
import { getLoopsApiKey, isNotEmulated } from "./env.utils";

const loops = (): Nullable<LoopsClient> => {
	const apiKey = getLoopsApiKey();
	if (!apiKey) {
		console.log("no loops api key found, loops client not created");
		return null;
	}

	console.log("loops api key found, creating loops client");
	return new LoopsClient(apiKey);
};

const getEmailForUserId = async (userId: string): Promise<Nullable<string>> => {
	const auth = await admin.auth().getUser(userId);
	if (!auth) {
		return null;
	}

	if (isNotEmulated()) {
		const isGoogleAccount = auth.providerData.some(
			(provider) => provider.providerId === "google.com",
		);
		if (!isGoogleAccount) {
			return null;
		}
	}

	return auth.email ?? null;
};

const getFirstAndLastName = (
	name: string,
): { firstName: Nullable<string>; lastName: Nullable<string> } => {
	const parts = name.trim().split(" ");
	if (parts.length === 0) {
		return { firstName: null, lastName: null };
	} else if (parts.length === 1) {
		return { firstName: parts[0] ?? null, lastName: null };
	} else {
		return {
			firstName: parts[0] ?? null,
			lastName: parts.slice(1).join(" ") ?? null,
		};
	}
};

const upsertLoopsContact = async (userId: string, create: boolean) => {
	const email = await getEmailForUserId(userId);
	if (!email) {
		console.warn("user has no email, cannot upsert loops contact", userId);
		return;
	}

	const user = await firemix().get(mixpath.users(userId));
	const member = await firemix().get(mixpath.members(userId));
	const nameParts = getFirstAndLastName(user?.data.name ?? "");
	const isPaying =
		member &&
		member.data.plan &&
		member.data.plan !== "free" &&
		!member.data.isOnTrial;

	const contactProperties: ContactProperties = {
		userId,
		name: user?.data.name ?? null,
		firstName: nameParts.firstName ?? null,
		lastName: nameParts.lastName ?? null,
		plan: member?.data.plan ?? null,
		isPaying,
	};

	const dbContactProps: Contact = {
		id: userId,
		email,
		name: user?.data.name ?? null,
		firstName: nameParts.firstName ?? null,
		lastName: nameParts.lastName ?? null,
		plan: member?.data.plan ?? null,
		isPaying,
	};

	if (create) {
		const userGroup = "early-adopters";
		const createdAt = new Date().toISOString();

		await loops()?.updateContact(email, {
			...contactProperties,
			userGroup,
			createdAt,
			subscribed: true,
		});
		await firemix().merge(mixpath.contacts(userId), {
			...dbContactProps,
			userGroup,
			createdAt,
		});
	} else {
		await loops()?.updateContact(email, contactProperties);
		await firemix().merge(mixpath.contacts(userId), dbContactProps);
	}

	console.log("upserted loops contact for user", userId);
};

export const createLoopsContact = async (userId: string) => {
	await upsertLoopsContact(userId, true);
};

export const updateLoopsContact = async (userId: string) => {
	await upsertLoopsContact(userId, false);
};

export const deleteLoopsContact = async (userId: string) => {
	await loops()?.deleteContact({ userId });
	await firemix().delete(mixpath.contacts(userId));
};

export type LoopsEventName =
	| "finished-onboarding"
	| "account-deletion-started"
	| "dictated-1000-words";

export const sendLoopsEvent = async (args: {
	userId: string;
	eventName: LoopsEventName;
	contactProperties?: ContactProperties;
	eventProperties?: EventProperties;
}) => {
	const email = await getEmailForUserId(args.userId);
	if (loops()) {
		console.log("sending loops event", args.eventName, "for user", args.userId);
	}

	await loops()?.sendEvent({
		userId: args.userId,
		email: email ?? undefined,
		eventName: args.eventName,
		contactProperties: args.contactProperties,
		eventProperties: args.eventProperties,
	});
};
