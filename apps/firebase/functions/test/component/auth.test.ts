import { getAuth, signInWithCustomToken } from "firebase/auth";
import { blaze, invokeHandler, path, retry } from "../../src/shared";
import {
	createUserCreds,
	deleteMyUser as deleteMyUserImmediate,
	signInWithCreds,
} from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";
import { buildUser } from "../../src/shared/entities";

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
		const before = await blaze().query(
			path.delayedActions(),
			["type", "==", "deleteAccount"],
			["userId", "==", creds.id]
		);
		expect(before.length).toBe(0);

		// should create a delete account action
		await invokeHandler("auth/deleteMyAccount", {});
		const after = await blaze().query(
			path.delayedActions(),
			["type", "==", "deleteAccount"],
			["userId", "==", creds.id]
		);
		expect(after.length).toBe(1);
		expect(after[0].data.status).toBe("pending");
		expect(after[0].data.runAfterTimestamp.toMillis()).toBeGreaterThan(
			Date.now() + 29 * 24 * 60 * 60 * 1000
		);

		// should still be only one action if you do it again
		await invokeHandler("auth/deleteMyAccount", {});
		const after2 = await blaze().query(
			path.delayedActions(),
			["type", "==", "deleteAccount"],
			["userId", "==", creds.id]
		);
		expect(after2.length).toBe(1);
		expect(after2[0].data.status).toBe("pending");
		expect(after2[0].data.runAfterTimestamp.toMillis()).toBeGreaterThan(
			Date.now() + 29 * 24 * 60 * 60 * 1000
		);

		// if you call cancel, it should cancel the delete account action
		await invokeHandler("auth/cancelAccountDeletion", {});
		await retry(async () => {
			const afterSignIn = await blaze().query(
				path.delayedActions(),
				["type", "==", "deleteAccount"],
				["userId", "==", creds.id]
			);
			expect(afterSignIn.length).toBe(0);
		});
	});
});

describe("onDelete", () => {
	it("should delete user resources", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);

		await invokeHandler("member/tryInitialize", {});
		await blaze().set(
			path.users(creds.id),
			buildUser({
				name: "Test User",
				id: creds.id,
			})
		);

		await expect(blaze().get(path.users(creds.id))).resolves.toBeDefined();
		await expect(blaze().get(path.members(creds.id))).resolves.toBeDefined();

		await deleteMyUserImmediate();

		await retry(
			async () => {
				await expect(blaze().get(path.users(creds.id))).resolves.toBeNull();
				await expect(blaze().get(path.members(creds.id))).resolves.toBeNull();
			},
			20,
			100
		);
	});
});
