import { invokeHandler } from "@repo/functions";
import { buildUser } from "../helpers/entities";
import {
	createUserCreds,
	markUserAsSubscribed,
	signInWithCreds,
} from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

describe("api", () => {
	it("lets me manage my user", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		const nothing = await invokeHandler("user/getMyUser", {}).then(
			(res) => res.user,
		);
		expect(nothing).toBeNull();

		const testUser = buildUser();
		await invokeHandler("user/setMyUser", { value: testUser });

		const myUser = await invokeHandler("user/getMyUser", {}).then(
			(res) => res.user,
		);
		expect(myUser).not.toBeNull();
		expect(myUser?.id).toBe(creds.id);
		expect(myUser?.name).toBe(testUser.name);
	});

	it("sets and retrieves stylingMode", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		const testUser = buildUser({ stylingMode: "manual" });
		await invokeHandler("user/setMyUser", { value: testUser });

		const myUser = await invokeHandler("user/getMyUser", {}).then(
			(res) => res.user,
		);
		expect(myUser?.stylingMode).toBe("manual");
	});

	it("sets and retrieves selectedToneId", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		const testUser = buildUser({ selectedToneId: "tone-abc" });
		await invokeHandler("user/setMyUser", { value: testUser });

		const myUser = await invokeHandler("user/getMyUser", {}).then(
			(res) => res.user,
		);
		expect(myUser?.selectedToneId).toBe("tone-abc");
	});

	it("sets and retrieves activeToneIds", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		const testUser = buildUser({ activeToneIds: ["tone-x", "tone-y"] });
		await invokeHandler("user/setMyUser", { value: testUser });

		const myUser = await invokeHandler("user/getMyUser", {}).then(
			(res) => res.user,
		);
		expect(myUser?.activeToneIds).toEqual(["tone-x", "tone-y"]);
	});

	it("can set activeToneIds to null", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		await invokeHandler("user/setMyUser", {
			value: buildUser({ activeToneIds: ["tone-x"] }),
		});

		await invokeHandler("user/setMyUser", {
			value: buildUser({ activeToneIds: null }),
		});

		const myUser = await invokeHandler("user/getMyUser", {}).then(
			(res) => res.user,
		);
		expect(myUser?.activeToneIds).toBeNull();
	});

	it("can set selectedToneId to null", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		await invokeHandler("user/setMyUser", {
			value: buildUser({ selectedToneId: "tone-abc" }),
		});

		await invokeHandler("user/setMyUser", {
			value: buildUser({ selectedToneId: null }),
		});

		const myUser = await invokeHandler("user/getMyUser", {}).then(
			(res) => res.user,
		);
		expect(myUser?.selectedToneId).toBeNull();
	});

	it("sets and retrieves streak fields", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		const testUser = buildUser({ streak: 5, streakRecordedAt: "2026-02-12" });
		await invokeHandler("user/setMyUser", { value: testUser });

		const myUser = await invokeHandler("user/getMyUser", {}).then(
			(res) => res.user,
		);
		expect(myUser?.streak).toBe(5);
		expect(myUser?.streakRecordedAt).toBe("2026-02-12");
	});

	it("can set stylingMode to null", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		await invokeHandler("user/setMyUser", {
			value: buildUser({ stylingMode: "app" }),
		});

		await invokeHandler("user/setMyUser", {
			value: buildUser({ stylingMode: null }),
		});

		const myUser = await invokeHandler("user/getMyUser", {}).then(
			(res) => res.user,
		);
		expect(myUser?.stylingMode).toBeNull();
	});
});
