import * as admin from "firebase-admin";
import { invokeHandler } from "@repo/functions";
import dayjs from "dayjs";
import { createUserCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";
import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { DeleteAccountAction } from "@repo/types";
import { retry } from "@repo/utilities";

beforeAll(setUp);
afterAll(tearDown);

describe("processDelayedActionsCron", () => {
  it("should delete accounts correctly", async () => {
    const credsReady = await createUserCreds();
    const credsNotReady = await createUserCreds();
    const credsNotRequested = await createUserCreds();

    const beforeNow = dayjs().subtract(1, "minute").toDate();
    const afterNow = dayjs().add(1, "minute").toDate();

    // create delete actions for the first two users
    const credsReadyAction: DeleteAccountAction = {
      id: firemix().id(),
      type: "deleteAccount",
      userId: credsReady.id,
      status: "pending",
      runAfterTimestamp: firemix().timestampFromDate(beforeNow),
      createdAt: firemix().now(),
    };
    const credsNotReadyAction: DeleteAccountAction = {
      id: firemix().id(),
      type: "deleteAccount",
      userId: credsNotReady.id,
      status: "pending",
      runAfterTimestamp: firemix().timestampFromDate(afterNow),
      createdAt: firemix().now(),
    };
    await firemix().set(
      mixpath.delayedActions(credsReadyAction.id),
      credsReadyAction
    );
    await firemix().set(
      mixpath.delayedActions(credsNotReadyAction.id),
      credsNotReadyAction
    );

    // process delayed actions
    await invokeHandler("emulator/processDelayedActions", {});

    // the ready user should be deleted
    const postReadyUser = await admin
      .auth()
      .getUser(credsReady.id)
      .catch(() => null);
    expect(postReadyUser).toBeNull();

    // the other users should still exist
    const postNotReadyUser = await admin
      .auth()
      .getUser(credsNotReady.id)
      .catch(() => null);
    expect(postNotReadyUser).not.toBeNull();
    const postNotRequestedUser = await admin
      .auth()
      .getUser(credsNotRequested.id)
      .catch(() => null);
    expect(postNotRequestedUser).not.toBeNull();
  });
});
