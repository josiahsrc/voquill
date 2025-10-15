import { onDocumentWritten } from "firebase-functions/v2/firestore";
import {
	trySendFinishedOnboardingEvent,
	tryUpdateUserLoopsContact,
} from "../services/user.service";
import { Nullable, User } from "../shared";
import { LOOPS_API_KEY_VAR } from "../utils/env.utils";

export const onWrite = onDocumentWritten(
	{
		document: "users/{userId}",
		secrets: [LOOPS_API_KEY_VAR],
	},
	async (event) => {
		const userId = event.params.userId;
		const before = event.data?.before.data() as Nullable<User>;
		const after = event.data?.after.data() as Nullable<User>;

		await tryUpdateUserLoopsContact({ userId, before, after }).catch((err) => {
			console.error("error updating loops contact for user", err);
		});

		await trySendFinishedOnboardingEvent({ userId, before, after }).catch(
			(err) => {
				console.error("error sending finished onboarding event for user", err);
			}
		);
	}
);
