import { firemix, FiremixBatchDelegate } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";

export const cancelAccountDeletionForUserId = async (args: {
	userId: string;
}): Promise<void> => {
	const actions = await firemix().query(
		mixpath.delayedActions(),
		["type", "==", "deleteAccount"],
		["status", "==", "pending"]
	);

	if (actions.length === 0) {
		console.log("no delete account action found for user:", args.userId);
		return;
	}

	const delegates: FiremixBatchDelegate[] = [];
	for (const action of actions) {
		delegates.push((b) => {
			b.delete(mixpath.delayedActions(action.id));
		});
	}

	await firemix().executeBatchWrite(delegates);
};
