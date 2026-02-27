import { Nullable, User } from "@repo/types";
import { sendLoopsEvent, updateLoopsContact } from "../utils/loops.utils";
import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { AuthData } from "firebase-functions/tasks";
import { checkAccess } from "../utils/check.utils";
import { userFromDatabase, userToDatabase } from "../utils/type.utils";
import { HandlerInput, HandlerOutput } from "@repo/functions";
import { dayjsForTimezone } from "../utils/date.utils";

export const tryUpdateUserLoopsContact = async (args: {
	userId: string;
	before: Nullable<User>;
	after: Nullable<User>;
}) => {
	const prevName = args.before?.name;
	const newName = args.after?.name;
	if (prevName === newName) {
		return;
	}

	console.log("updating loops contact name for user", args.userId);
	await updateLoopsContact(args.userId);
};

export const trySendFinishedOnboardingEvent = async (args: {
	userId: string;
	before: Nullable<User>;
	after: Nullable<User>;
}) => {
	const prevOnboarded = args.before?.onboarded ?? false;
	const newOnboarded = args.after?.onboarded ?? false;
	if (prevOnboarded === newOnboarded || !newOnboarded) {
		return;
	}

	console.log("updating contact before sending finished onboarding event");
	await updateLoopsContact(args.userId);

	console.log("sending finished onboarding event for user", args.userId);
	await sendLoopsEvent({
		userId: args.userId,
		eventName: "finished-onboarding",
	});
};

export const getMyUser = async (args: {
	auth: Nullable<AuthData>;
}): Promise<HandlerOutput<"user/getMyUser">> => {
	const access = await checkAccess(args.auth);
	const user = await firemix().get(mixpath.users(access.auth.uid));
	return {
		user: user?.data ? userFromDatabase(user.data) : null,
	};
};

export const setMyUser = async (args: {
	auth: Nullable<AuthData>;
	data: User;
}): Promise<HandlerOutput<"user/setMyUser">> => {
	const access = await checkAccess(args.auth);
	const userId = access.auth.uid;
	const data = args.data;
	await firemix().set(mixpath.users(userId), {
		...userToDatabase(data),
		id: userId,
		updatedAt: firemix().now(),
	});
	return {};
};

const nowForTz = (tz?: string | null) =>
	tz ? dayjsForTimezone(tz) : dayjsForTimezone("UTC");

export const incrementWordCount = async (args: {
	auth: Nullable<AuthData>;
	input: HandlerInput<"user/incrementWordCount">;
}): Promise<HandlerOutput<"user/incrementWordCount">> => {
	const access = await checkAccess(args.auth);
	const userId = access.auth.uid;
	const { wordCount, timezone } = args.input;
	if (wordCount <= 0) return {};

	await firemix().transaction(async (tx) => {
		const doc = await tx.get(mixpath.users(userId));
		if (!doc) return;
		const user = doc.data;
		const currentMonth = nowForTz(timezone).format("YYYY-MM");
		const wordsThisMonth =
			user.wordsThisMonthMonth !== currentMonth
				? wordCount
				: (user.wordsThisMonth ?? 0) + wordCount;
		tx.update(mixpath.users(userId), {
			wordsThisMonth,
			wordsThisMonthMonth: currentMonth,
			wordsTotal: (user.wordsTotal ?? 0) + wordCount,
			updatedAt: firemix().now(),
		});
	});
	return {};
};

export const trackStreak = async (args: {
	auth: Nullable<AuthData>;
	input: HandlerInput<"user/trackStreak">;
}): Promise<HandlerOutput<"user/trackStreak">> => {
	const access = await checkAccess(args.auth);
	const userId = access.auth.uid;
	const { timezone } = args.input;

	await firemix().transaction(async (tx) => {
		const doc = await tx.get(mixpath.users(userId));
		if (!doc) return;
		const user = doc.data;
		const now = nowForTz(timezone);
		const today = now.format("YYYY-MM-DD");
		if (user.streakRecordedAt === today) return;

		const yesterday = now.subtract(1, "day").format("YYYY-MM-DD");
		const streak =
			user.streakRecordedAt === yesterday ? (user.streak ?? 0) + 1 : 1;
		tx.update(mixpath.users(userId), {
			streak,
			streakRecordedAt: today,
			updatedAt: firemix().now(),
		});
	});
	return {};
};
