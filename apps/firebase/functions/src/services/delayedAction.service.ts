import { DelayedAction } from "@repo/types";
import { runDeleteAccountAction } from "../utils/delayedAction.utils";
import { firemix } from "@firemix/mixed";
import { batchAsync } from "@repo/utilities";
import { mixpath } from "@repo/firemix";

const processAction = async (action: DelayedAction): Promise<void> => {
  try {
    if (action.type === "deleteAccount") {
      await runDeleteAccountAction(action);
    } else {
      throw new Error(`Unknown delayed action type: ${action}`);
    }

    await firemix().update(mixpath.delayedActions(action.id), {
      ...action,
      status: "completed",
      processedAt: firemix().now(),
      errorMessage: null,
    });
  } catch (e) {
    console.error("Error processing delayed action", action, e);
    await firemix().update(mixpath.delayedActions(action.id), {
      ...action,
      status: "failed",
      processedAt: firemix().now(),
      errorMessage: String(e),
    });
  }
};

export const processDelayedActions = async (): Promise<void> => {
  const actions = await firemix().query(mixpath.delayedActions(), [
    "where",
    "runAfterTimestamp",
    "<",
    firemix().now(),
  ]);

  await batchAsync(
    12,
    actions.map((action) => () => processAction(action.data))
  );
};
