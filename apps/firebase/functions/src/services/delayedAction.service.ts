import { batchAsync, blaze, DelayedAction, path } from "../shared";
import { runDeleteAccountAction } from "../utils/delayedAction.utils";

const processAction = async (action: DelayedAction): Promise<void> => {
	try {
		if (action.type === "deleteAccount") {
			await runDeleteAccountAction(action);
		} else {
			throw new Error(`Unknown delayed action type: ${action}`);
		}

		await blaze().update(path.delayedActions(action.id), {
			...action,
			status: "completed",
			processedAt: blaze().now(),
			errorMessage: null,
		});
	} catch (e) {
		console.error("Error processing delayed action", action, e);
		await blaze().update(path.delayedActions(action.id), {
			...action,
			status: "failed",
			processedAt: blaze().now(),
			errorMessage: String(e),
		});
	}
};

export const processDelayedActions = async (): Promise<void> => {
	const actions = await blaze().query(path.delayedActions(), [
		"runAfterTimestamp",
		"<",
		blaze().now(),
	]);

	await batchAsync(
		12,
		actions.map((action) => () => processAction(action.data))
	);
};
