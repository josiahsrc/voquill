import { blaze, BlazeBatchDelegate, path } from "../shared";

export const cancelAccountDeletionForUserId = async (args: {
	userId: string;
}): Promise<void> => {
	const actions = await firemix().query(
		path.delayedActions(),
		["type", "==", "deleteAccount"],
		["status", "==", "pending"]
	);

	if (actions.length === 0) {
		console.log("no delete account action found for user:", args.userId);
		return;
	}

	const delegates: BlazeBatchDelegate[] = [];
	for (const action of actions) {
		delegates.push((b) => {
			b.delete(path.delayedActions(action.id));
		});
	}

	await firemix().executeBatchWrite(delegates);
};
