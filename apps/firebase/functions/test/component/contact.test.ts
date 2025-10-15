import { firemix } from "@firemix/mixed";
import {
  createUserCreds,
  deleteMyUser,
  signInWithCreds,
} from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";
import { mixpath } from "@repo/firemix";
import { retry } from "@repo/utilities";

beforeAll(setUp);
afterAll(tearDown);

describe("lifecycle", () => {
  it("works", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);

    const getContact = async () => firemix().get(mixpath.contacts(creds.id));

    // user is created
    await retry({
      fn: async () => {
        const contactSnap = await getContact();
        expect(contactSnap).toBeDefined();
        expect(contactSnap?.data).toBeDefined();
        expect(contactSnap?.data.id).toBe(creds.id);
        expect(contactSnap?.data.email).toBe(creds.email);
        expect(contactSnap?.data.plan).toBe("free");
        expect(contactSnap?.data.isPaying).toBe(false);
        expect(contactSnap?.data.userGroup).toBe("early-adopters");
        expect(contactSnap?.data.createdAt).toBeDefined();
      },
      retries: 20,
      delay: 100
    });

    // update the member to pro
    await firemix().merge(mixpath.members(creds.id), { plan: "pro" });
    await retry({
      fn: async () => {
        const contactSnap = await getContact();
        expect(contactSnap).toBeDefined();
        expect(contactSnap?.data).toBeDefined();
        expect(contactSnap?.data.id).toBe(creds.id);
        expect(contactSnap?.data.email).toBe(creds.email);
        expect(contactSnap?.data.plan).toBe("pro");
        expect(contactSnap?.data.isPaying).toBe(true);
        expect(contactSnap?.data.userGroup).toBe("early-adopters");
        expect(contactSnap?.data.createdAt).toBeDefined();
      },
      retries: 20,
      delay: 100
    });

    // create the user document
    await firemix().merge(mixpath.users(creds.id), { name: "Test User" });
    await retry({
      fn: async () => {
        const contactSnap = await getContact();
        expect(contactSnap).toBeDefined();
        expect(contactSnap?.data).toBeDefined();
        expect(contactSnap?.data.id).toBe(creds.id);
        expect(contactSnap?.data.email).toBe(creds.email);
        expect(contactSnap?.data.firstName).toBe("Test");
        expect(contactSnap?.data.name).toBe("Test User");
        expect(contactSnap?.data.lastName).toBe("User");
        expect(contactSnap?.data.userGroup).toBe("early-adopters");
        expect(contactSnap?.data.createdAt).toBeDefined();
      },
      retries: 20,
      delay: 100
    });

    // delete the user
    await deleteMyUser();
    await retry({
      fn: async () => {
        const contactSnap = await getContact();
        expect(contactSnap).toBeNull();
      },
      retries: 20,
      delay: 100
    });
  });
});
