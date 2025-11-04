import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { HandlerOutput } from "@repo/functions";
import { DeleteAccountAction, Nullable } from "@repo/types";
import dayjs from "dayjs";
import { AuthData } from "firebase-functions/tasks";
import { cancelAccountDeletionForUserId } from "../utils/auth.utils";
import { UnauthenticatedError } from "../utils/error.utils";
import { sendLoopsEvent } from "../utils/loops.utils";

export const cancelAccountDeletion = async (args: {
  auth: Nullable<AuthData>;
}): Promise<HandlerOutput<"auth/cancelAccountDeletion">> => {
  if (!args.auth) {
    console.log("missing auth data");
    throw new UnauthenticatedError("You must be authenticated");
  }

  await cancelAccountDeletionForUserId({
    userId: args.auth.uid,
  });

  return {};
};

export const enqueueAccountDeletion = async (args: {
  auth: Nullable<AuthData>;
}): Promise<HandlerOutput<"auth/deleteMyAccount">> => {
  if (!args.auth) {
    console.log("missing auth data");
    throw new UnauthenticatedError("You must be authenticated");
  }

  await cancelAccountDeletionForUserId({
    userId: args.auth.uid,
  });

  const oneMonthFromNow = dayjs().add(30, "day").toDate();

  const entry: DeleteAccountAction = {
    id: args.auth.uid,
    createdAt: firemix().now(),
    createdByUserId: args.auth.uid,
    type: "deleteAccount",
    userId: args.auth.uid,
    runAfterTimestamp: firemix().timestampFromDate(oneMonthFromNow),
    status: "pending",
  };

  await firemix().set(mixpath.delayedActions(args.auth.uid), entry);
  await sendLoopsEvent({
    userId: args.auth.uid,
    eventName: "account-deletion-started",
  });

  return {};
};
