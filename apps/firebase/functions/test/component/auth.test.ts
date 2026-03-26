import { firemix } from "@firemix/mixed";
import { mixpath } from "@voquill/firemix";
import { invokeHandler } from "@voquill/functions";
import { retry } from "@voquill/utilities";
import { userToDatabase } from "../../src/utils/type.utils";
import { buildUser } from "../helpers/entities";
import {
	createUserCreds,
	deleteMyUser as deleteMyUserImmediate,
	markUserAsSubscribed,
	signInWithCreds,
} from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

describe("onDelete", () => {
	it("should delete user resources", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		await invokeHandler("member/tryInitialize", {});
		await firemix().set(
			mixpath.users(creds.id),
			userToDatabase(
				buildUser({
					name: "Test User",
					id: creds.id,
				}),
			),
		);

		await expect(firemix().get(mixpath.users(creds.id))).resolves.toBeDefined();
		await expect(
			firemix().get(mixpath.members(creds.id)),
		).resolves.toBeDefined();

		await deleteMyUserImmediate();

		await retry({
			fn: async () => {
				await expect(
					firemix().get(mixpath.users(creds.id)),
				).resolves.toBeNull();
				await expect(
					firemix().get(mixpath.members(creds.id)),
				).resolves.toBeNull();
			},
			retries: 20,
			delay: 100,
		});
	});
});
