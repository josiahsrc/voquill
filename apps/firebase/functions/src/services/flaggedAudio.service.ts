import { firemix } from "@firemix/mixed";
import { mixpath } from "@voquill/firemix";
import { HandlerInput, HandlerOutput } from "@voquill/functions";
import { Nullable } from "@voquill/types";
import { AuthData } from "firebase-functions/tasks";
import { checkAccess } from "../utils/check.utils";

export const upsertFlaggedAudio = async (args: {
	auth: Nullable<AuthData>;
	input: HandlerInput<"flaggedAudio/upsert">;
}): Promise<HandlerOutput<"flaggedAudio/upsert">> => {
	await checkAccess(args.auth);
	await firemix().set(
		mixpath.flaggedAudio(args.input.flaggedAudio.id),
		args.input.flaggedAudio,
	);
	return {};
};
