import { blaze, blazeSdkZoneSync, path } from "../../src/shared";
import { buildUser } from "../../src/shared/entities";
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

	it("lets me read/write my user", async () => {
		const user = blazeSdkZoneSync("client", () => buildUser({ id: userId }));
		await blaze("client").set(path.users(userId), user);
		await expect(
			blaze("client").get(path.users(userId))
		).resolves.not.toThrow();
	});

	it("prevents me from accessing other users", async () => {
		const user = blazeSdkZoneSync("client", () => buildUser({ id: userId }));
		await expect(blaze("client").query(path.users())).rejects.toThrow();
		await expect(
			blaze("client").get(path.users("differentUserId"))
		).rejects.toThrow();
		await expect(
			blaze("client").set(path.users("differentUserId"), user)
		).rejects.toThrow();
	});
});
