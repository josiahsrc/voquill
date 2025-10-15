import { AuthData } from "firebase-functions/tasks";
import { HandlerInput, HandlerOutput } from "@repo/functions";
import { blaze, Member, Nullable, path } from "../shared";
import { UnauthenticatedError } from "../utils/error.utils";
import { tryInitializeMember } from "../utils/member.utils";
import dayjs from "dayjs";
import { sendLoopsEvent, updateLoopsContact } from "../utils/loops.utils";

export const handleTryInitializeMember = async (args: {
	auth: Nullable<AuthData>;
	input: HandlerInput<"member/tryInitialize">;
}): Promise<HandlerOutput<"member/tryInitialize">> => {
	const userId = args.auth?.uid;
	if (!userId) {
		console.log("no auth data provided");
		throw new UnauthenticatedError("You must be authenticated");
	}

	await tryInitializeMember(userId);
	return {};
};

export const handleResetWordsToday = async (): Promise<void> => {
	const now = blaze().now();
	const expiration = dayjs().add(1, "day").toDate();

	const members = await blaze().query(path.members(), [
		"wordsTodayResetAt",
		"<=",
		now,
	]);

	await blaze().executeBatchWrite(
		members.map(
			(member) => (b) =>
				b.update(path.members(member.id), {
					wordsToday: 0,
					wordsTodayResetAt: blaze().timestampFromDate(expiration),
				})
		)
	);
};

export const handleResetWordsThisMonth = async (): Promise<void> => {
	const now = blaze().now();
	const expiration = dayjs().add(1, "month").toDate();

	const members = await blaze().query(path.members(), [
		"wordsThisMonthResetAt",
		"<=",
		now,
	]);

	await blaze().executeBatchWrite(
		members.map(
			(member) => (b) =>
				b.update(path.members(member.id), {
					wordsThisMonth: 0,
					wordsThisMonthResetAt: blaze().timestampFromDate(expiration),
				})
		)
	);
};

export const tryUpdateMemberLoopsContact = async (args: {
	before: Nullable<Member>;
	after: Nullable<Member>;
}) => {
	const prevPlan = args.before?.plan;
	const newPlan = args.after?.plan;
	if (prevPlan === newPlan) {
		return;
	}

	const userIds = args.after?.userIds ?? [];
	for (const userId of userIds) {
		await updateLoopsContact(userId);
		console.log("updated loops contact name for user", userId);
	}
};

export const trySend1000WordsEvent = async (args: {
	before: Nullable<Member>;
	after: Nullable<Member>;
}): Promise<void> => {
	const prevWordsTotal = args.before?.wordsTotal ?? 0;
	const newWordsTotal = args.after?.wordsTotal ?? 0;
	if (prevWordsTotal >= 1000 || newWordsTotal < 1000) {
		return;
	}

	const userIds = args.after?.userIds ?? [];
	for (const userId of userIds) {
		await sendLoopsEvent({
			userId: userId,
			eventName: "dictated-1000-words",
		});
		console.log("sent dictated-1000-words event for user", userId);
	}
};
