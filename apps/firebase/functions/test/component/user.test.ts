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
