import { blaze, path } from "../../src/shared";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

describe("firestore rules", () => {
	beforeEach(async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
	});

	it("works", async () => {
		await blaze().set(path.systemConfig(), {
			freeWordsPerDay: 1000,
		});

		await expect(
			blaze("client").get(path.systemConfig())
		).resolves.not.toThrow();

		await expect(
			blaze("client").set(path.systemConfig(), {
				freeWordsPerDay: 1000,
			})
		).rejects.toThrow();
	});
});
