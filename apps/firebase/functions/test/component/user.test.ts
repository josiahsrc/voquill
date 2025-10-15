import { firemix, firemixSdkZoneSync } from "@firemix/mixed";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";
import { buildUser } from "../helpers/entities";
import { mixpath } from "@repo/firemix";

beforeAll(setUp);
afterAll(tearDown);

describe("firestore rules", () => {
  let userId: string;

  beforeEach(async () => {
    const creds = await createUserCreds();
    const user = await signInWithCreds(creds);
    userId = user.uid;
  });

  it("lets me read/write my user", async () => {
    const user = firemixSdkZoneSync("client", () => buildUser({ id: userId }));
    await firemix("client").set(mixpath.users(userId), user);
    await expect(
      firemix("client").get(mixpath.users(userId))
    ).resolves.not.toThrow();
  });

  it("prevents me from accessing other users", async () => {
    const user = firemixSdkZoneSync("client", () => buildUser({ id: userId }));
    await expect(firemix("client").query(mixpath.users())).rejects.toThrow();
    await expect(
      firemix("client").get(mixpath.users("differentUserId"))
    ).rejects.toThrow();
    await expect(
      firemix("client").set(mixpath.users("differentUserId"), user)
    ).rejects.toThrow();
  });
});
