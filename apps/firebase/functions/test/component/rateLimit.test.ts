import { invokeHandler } from "@repo/functions";
import * as admin from "firebase-admin";
import { buildUser } from "../helpers/entities";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

describe("rate limiting", () => {
  it("increments my limits when I call", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);

    const prevLimit = (await admin.database().ref(`/limits/${creds.id}`).get()).val() || 0;
    expect(prevLimit).toBe(0);

    await invokeHandler("user/getMyUser", {});
    const newLimit = (await admin.database().ref(`/limits/${creds.id}`).get()).val() || 0;
    expect(newLimit).toBe(1);

    await invokeHandler("user/getMyUser", {});
    const latestLimit = (await admin.database().ref(`/limits/${creds.id}`).get()).val() || 0;
    expect(latestLimit).toBe(2);
  });

  it("resets when the limit reset is called", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);

    const limitRef = admin.database().ref(`/limits/${creds.id}`);
    await limitRef.set(10);

    await invokeHandler("emulator/clearRateLimits", {});

    const latestLimit = (await limitRef.get()).val() || 0;
    expect(latestLimit).toBe(0);
  });

  it("disables my account when I exceed rate limit", async () => {
    const runTest = async (fn: () => Promise<unknown>) => {
      const creds = await createUserCreds();
      await signInWithCreds(creds);

      // Simulate exceeding rate limit
      const limitRef = admin.database().ref(`/limits/${creds.id}`);
      await limitRef.set(1_000_000);

      await expect(fn()).rejects.toThrow(
        /rate limit exceeded/i
      );

      const isAccountDisabled = (await admin.auth().getUser(creds.id)).disabled;
      expect(isAccountDisabled).toBe(true);

      // Reset the limit back to 0
      await limitRef.set(0);

      // you shouldn't be able to hit the API
      await expect(fn()).rejects.toThrow(/disabled/i);
    }

    await runTest(() => invokeHandler("user/getMyUser", {}));
    await runTest(() => invokeHandler("user/setMyUser", { value: buildUser() }));
    await runTest(() => invokeHandler("member/getMyMember", {}));
  });
});
