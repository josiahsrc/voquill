import { getAuth, signInWithCustomToken } from "firebase/auth";
import { invokeHandler } from "@repo/functions";
import {
  createUserCreds,
  deleteMyUser as deleteMyUserImmediate,
  signInWithCreds,
} from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";
import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { retry } from "@repo/utilities";
import { buildUser } from "../helpers/entities";

beforeAll(setUp);
afterAll(tearDown);

describe("createCustomToken", () => {
  it("works", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);
    const res = await invokeHandler("auth/createCustomToken", {});
    expect(res.customToken).toBeDefined();
    await signInWithCustomToken(getAuth(), res.customToken);
  });
});

describe("deleteMyAccount", () => {
  it("should enqueue delete account action", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);

    // should not have any delete account actions to start
    const before = await firemix().query(
      mixpath.delayedActions(),
      ["where", "type", "==", "deleteAccount"],
      ["where", "userId", "==", creds.id]
    );
    expect(before.length).toBe(0);

    // should create a delete account action
    await invokeHandler("auth/deleteMyAccount", {});
    const after = await firemix().query(
      mixpath.delayedActions(),
      ["where", "type", "==", "deleteAccount"],
      ["where", "userId", "==", creds.id]
    );
    expect(after.length).toBe(1);
    expect(after[0]?.data.status).toBe("pending");
    expect(after[0]?.data.runAfterTimestamp.toMillis()).toBeGreaterThan(
      Date.now() + 29 * 24 * 60 * 60 * 1000
    );

    // should still be only one action if you do it again
    await invokeHandler("auth/deleteMyAccount", {});
    const after2 = await firemix().query(
      mixpath.delayedActions(),
      ["where", "type", "==", "deleteAccount"],
      ["where", "userId", "==", creds.id]
    );
    expect(after2.length).toBe(1);
    expect(after2[0]?.data.status).toBe("pending");
    expect(after2[0]?.data.runAfterTimestamp.toMillis()).toBeGreaterThan(
      Date.now() + 29 * 24 * 60 * 60 * 1000
    );

    // if you call cancel, it should cancel the delete account action
    await invokeHandler("auth/cancelAccountDeletion", {});
    await retry({
      fn: async () => {
        const afterSignIn = await firemix().query(
          mixpath.delayedActions(),
          ["where", "type", "==", "deleteAccount"],
          ["where", "userId", "==", creds.id]
        );
        expect(afterSignIn.length).toBe(0);
      }
    });
  });
});

describe("onDelete", () => {
  it("should delete user resources", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);

    await invokeHandler("member/tryInitialize", {});
    await firemix().set(
      mixpath.users(creds.id),
      buildUser({
        name: "Test User",
        id: creds.id,
      })
    );

    await expect(firemix().get(mixpath.users(creds.id))).resolves.toBeDefined();
    await expect(firemix().get(mixpath.members(creds.id))).resolves.toBeDefined();

    await deleteMyUserImmediate();

    await retry({
      fn: async () => {
        await expect(firemix().get(mixpath.users(creds.id))).resolves.toBeNull();
        await expect(firemix().get(mixpath.members(creds.id))).resolves.toBeNull();
      },
      retries: 20,
      delay: 100
    });
  });
});
