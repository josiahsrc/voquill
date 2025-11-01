import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
	handleResetWordsThisMonth,
	handleResetWordsToday,
	trySend1000WordsEvent,
	tryUpdateMemberLoopsContact,
} from "../services/member.service";
import { LOOPS_API_KEY_VAR } from "../utils/env.utils";
import { Member, Nullable } from "@repo/types";

// Every hour
export const resetWordsTodayCron = onSchedule("0 * * * *", async () => {
	await handleResetWordsToday();
});

// Every hour
export const resetWordsThisMonthCron = onSchedule("0 * * * *", async () => {
	await handleResetWordsThisMonth();
});

export const onWrite = onDocumentWritten(
	{
		document: "members/{memberId}",
		secrets: [LOOPS_API_KEY_VAR],
	},
	async (event) => {
		const before = event.data?.before.data() as Nullable<Member>;
		const after = event.data?.after.data() as Nullable<Member>;

		await tryUpdateMemberLoopsContact({ before, after }).catch((err) => {
			console.error("error updating loops contact for member", err);
		});

		await trySend1000WordsEvent({ before, after }).catch((err) => {
			console.error("error sending 1000 words event for member", err);
		});
	}
);
