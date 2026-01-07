import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { FULL_CONFIG, Member } from "@repo/types";
import {
	getMemberExceedsTokenLimit,
	getMemberExceedsWordLimit,
} from "@repo/utilities";
import { AuthData } from "firebase-functions/tasks";
import { ClientError } from "./error.utils";
import { memberFromDatabase } from "./type.utils";

export const validateAudioInput = (args: {
	audioMimeType: string;
}): { ext: string } => {
	const audioMimeType = args.audioMimeType;
	const audioExt = audioMimeType.split("/").at(-1);
	if (!audioExt) {
		throw new ClientError("Invalid audio MIME type");
	}

	return { ext: audioExt };
};

export const validateMemberWithinLimits = async (args: {
	auth: AuthData;
}): Promise<{ member: Member }> => {
	const member = await firemix().get(mixpath.members(args.auth.uid));
	if (!member) {
		console.warn("no member found for user", args.auth.uid);
		throw new ClientError("You must be a member");
	}

	if (getMemberExceedsWordLimit(memberFromDatabase(member.data), FULL_CONFIG)) {
		console.warn("member exceeds word limit", member.data);
		throw new ClientError("You have exceeded your word limit");
	}

	if (getMemberExceedsTokenLimit(memberFromDatabase(member.data), FULL_CONFIG)) {
		console.warn("member exceeds token limit", member.data);
		throw new ClientError("You have exceeded your token limit");
	}

	return { member: memberFromDatabase(member.data) };
};

export const incrementWordCount = async (args: {
	auth: AuthData;
	count: number;
}): Promise<void> => {
	const roundedInt = Math.max(0, Math.round(args.count));
	await firemix().update(mixpath.members(args.auth.uid), {
		wordsToday: firemix().increment(roundedInt),
		wordsThisMonth: firemix().increment(roundedInt),
		wordsTotal: firemix().increment(roundedInt),
		updatedAt: firemix().now(),
	});
};

export const incrementTokenCount = async (args: {
	auth: AuthData;
	count: number;
}): Promise<void> => {
	const roundedInt = Math.max(0, Math.round(args.count));
	await firemix().update(mixpath.members(args.auth.uid), {
		tokensToday: firemix().increment(roundedInt),
		tokensThisMonth: firemix().increment(roundedInt),
		tokensTotal: firemix().increment(roundedInt),
		updatedAt: firemix().now(),
	});
};
