import { firemix } from "@firemix/mixed";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";
import { mixpath } from "@repo/firemix";

beforeAll(setUp);
afterAll(tearDown);

describe("firestore rules", () => {
  beforeEach(async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);
  });

  it("works", async () => {
    await firemix().set(mixpath.systemConfig(), {
      freeWordsPerDay: 1000,
    });

    await expect(
      firemix("client").get(mixpath.systemConfig())
    ).resolves.not.toThrow();

    await expect(
      firemix("client").set(mixpath.systemConfig(), {
        freeWordsPerDay: 1000,
      })
    ).rejects.toThrow();
  });
});
