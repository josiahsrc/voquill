import { firemix, firemixSdkZoneSync } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";
import { buildTermDoc } from "../helpers/entities";
import { invokeHandler } from "@repo/functions";

beforeAll(setUp);
afterAll(tearDown);

describe("firestore rules", () => {
  let userId: string;

  beforeEach(async () => {
    const creds = await createUserCreds();
    const user = await signInWithCreds(creds);
    await invokeHandler("member/tryInitialize", {});
    userId = user.uid;
  });

  it("lets me read/write my terms if I'm a paid user", async () => {
    const term = firemixSdkZoneSync("client", () => buildTermDoc({ id: userId }));
    await firemix("admin").update(mixpath.members(userId), { plan: "pro" });
    await firemix("client").set(mixpath.terms(term.id), term);
    await expect(
      firemix("client").get(mixpath.terms(term.id))
    ).resolves.not.toThrow();
  });

  it("prevents me from me writing my terms if I'm a free user", async () => {
    const term = firemixSdkZoneSync("client", () => buildTermDoc({ id: userId }));
    await expect(firemix("client").set(mixpath.terms(term.id), term)).rejects.toThrow();
    await expect(
      firemix("client").get(mixpath.terms(term.id))
    ).resolves.not.toThrow();
  });

  it("prevents me from accessing other users", async () => {
    const term = firemixSdkZoneSync("client", () => buildTermDoc({ id: "differentUserId" }));
    await firemix("admin").update(mixpath.members(userId), { plan: "pro" });
    await expect(firemix("client").query(mixpath.terms(term.id))).rejects.toThrow();
    await expect(
      firemix("client").get(mixpath.terms(term.id))
    ).rejects.toThrow();
    await expect(
      firemix("client").set(mixpath.terms(term.id), term)
    ).rejects.toThrow();
  });
});
