import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { HandlerInput, HandlerOutput } from "@repo/functions";
import { DatabaseTone, Nullable } from "@repo/types";
import { AuthData } from "firebase-functions/tasks";
import { checkAccess } from "../utils/check.utils";
import { toneFromDatabase, toneToDatabase } from "../utils/type.utils";

export const upsertMyTone = async (args: {
	auth: Nullable<AuthData>;
	input: HandlerInput<"tone/upsertMyTone">;
}): Promise<HandlerOutput<"tone/upsertMyTone">> => {
	const access = await checkAccess(args.auth);
	await firemix().merge(mixpath.toneDocs(access.auth.uid), {
		id: access.auth.uid,
		toneIds: firemix().arrayUnion(args.input.tone.id),
		toneById: {
			[args.input.tone.id]: toneToDatabase(args.input.tone),
		},
	});

	return {};
};

export const deleteMyTone = async (args: {
	auth: Nullable<AuthData>;
	input: HandlerInput<"tone/deleteMyTone">;
}): Promise<HandlerOutput<"tone/deleteMyTone">> => {
	const access = await checkAccess(args.auth);
	await firemix().merge(mixpath.toneDocs(access.auth.uid), {
		toneIds: firemix().arrayRemove(args.input.toneId),
		toneById: {
			[args.input.toneId]: firemix().deleteField(),
		},
	});

	return {};
};

export const listMyTones = async (args: {
	auth: Nullable<AuthData>;
}): Promise<HandlerOutput<"tone/listMyTones">> => {
	const access = await checkAccess(args.auth);
	const doc = await firemix().get(mixpath.toneDocs(access.auth.uid));
	const toneIds = doc?.data.toneIds ?? [];
	const tones = toneIds.map((id) => doc?.data.toneById?.[id]).filter(Boolean);
	return {
		tones: tones.map((t) => toneFromDatabase(t as DatabaseTone)),
	};
};
