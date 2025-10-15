import { onSchedule } from "firebase-functions/v2/scheduler";
import { processDelayedActions } from "../services/delayedAction.service";

// Every day
export const processDelayedActionsCron = onSchedule("0 0 * * *", async () => {
	await processDelayedActions();
});
