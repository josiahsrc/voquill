import { firemix, firemixSdkZoneSync } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { buildTerm } from "../helpers/entities";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

describe("firestore rules", () => {
  let userId: string;

  beforeEach(async () => {
    const creds = await createUserCreds();
    const user = await signInWithCreds(creds);
    userId = user.uid;
  });

  it("lets me read/write my terms", async () => {
    const term = firemixSdkZoneSync("client", () => buildTerm({ createdByUserId: userId }));
    await firemix("client").set(mixpath.terms(userId, term.id), term);
    await expect(
      firemix("client").get(mixpath.terms(userId, term.id))
    ).resolves.not.toThrow();
  });

  it("prevents me from accessing other users", async () => {
    const term = firemixSdkZoneSync("client", () => buildTerm({ createdByUserId: userId }));
    await expect(firemix("client").query(mixpath.terms("differentUserId"))).rejects.toThrow();
    await expect(
      firemix("client").get(mixpath.terms("differentUserId", term.id))
    ).rejects.toThrow();
    await expect(
      firemix("client").set(mixpath.terms("differentUserId", term.id), term)
    ).rejects.toThrow();
  });
});
