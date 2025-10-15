import * as v1 from "firebase-functions/v1";
import { cancelUserSubscriptions } from "../services/stripe.service";
import { blaze, path } from "../shared";
import { LOOPS_API_KEY_VAR } from "../utils/env.utils";
import { createLoopsContact, deleteLoopsContact } from "../utils/loops.utils";
import { tryInitializeMember } from "../utils/member.utils";

export const onCreate = v1
	.runWith({
		secrets: [LOOPS_API_KEY_VAR],
	})
	.auth.user()
	.onCreate(async (event) => {
		console.log("creating member for new user", event.uid);
		await tryInitializeMember(event.uid).catch((err) => {
			console.error("error initializing member for new user", event.uid, err);
		});

		console.log("creating loops contact for new user", event.uid);
		await createLoopsContact(event.uid).catch((err) => {
			console.error(
				"error creating loops contact for new user",
				event.uid,
				err
			);
		});

		console.log("finished creating member for new user", event.uid);
	});

export const onDelete = v1
	.runWith({
		secrets: [LOOPS_API_KEY_VAR],
	})
	.auth.user()
	.onDelete(async (event) => {
		console.log("canceling subscriptions for user", event.uid);
		await cancelUserSubscriptions({ userId: event.uid }).catch((err) => {
			console.error("error canceling subscriptions for user", event.uid, err);
		});

		console.log("deleting loops contact for user", event.uid);
		await deleteLoopsContact(event.uid).catch((err) => {
			console.error("error deleting loops contact for user", event.uid, err);
		});

		await firemix()
			.delete(path.users(event.uid))
			.catch((err) => {
				console.error("error deleting user document for user", event.uid, err);
			});

		await firemix()
			.delete(path.members(event.uid))
			.catch((err) => {
				console.error(
					"error deleting member document for user",
					event.uid,
					err
				);
			});

		console.log("finished deleting user resources for user", event.uid);
	});
