import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import * as admin from "firebase-admin";
import dayjs from "dayjs";
import { nanoid } from "nanoid";
import {
	handleExpiration,
	handleInitialPurchase,
} from "../../src/services/revenuecat.service";
import { memberToDatabase } from "../../src/utils/type.utils";
import { buildMember } from "../helpers/entities";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

const createAdminUser = async () => {
	const email = `test-${nanoid().toLowerCase()}@example.com`;
	const user = await admin.auth().createUser({ email, password: "password" });
	return user.uid;
};

const buildRevenueCatEvent = (opts: { userId: string; type: string }) => ({
	type: opts.type,
	app_user_id: opts.userId,
});

describe("handleInitialPurchase", () => {
	it("should upgrade a free member to pro", async () => {
		const uid = await createAdminUser();
		const member = memberToDatabase(
			buildMember({ id: uid, plan: "free", isOnTrial: false }),
		);

		await firemix().set(mixpath.members(uid), member);

		await handleInitialPurchase(
			buildRevenueCatEvent({ userId: uid, type: "INITIAL_PURCHASE" }),
		);

		const snap = await firemix().get(mixpath.members(uid));
		expect(snap?.data.plan).toBe("pro");
		expect(snap?.data.isOnTrial).toBe(false);
		expect(snap?.data.trialEndsAt).toBeNull();

		const user = await admin.auth().getUser(uid);
		expect(user.customClaims?.subscribed).toBe(true);
	});

	it("should clear trial state when a trial user purchases", async () => {
		const uid = await createAdminUser();
		const member = memberToDatabase(
			buildMember({
				id: uid,
				plan: "pro",
				isOnTrial: true,
				trialEndsAt: dayjs().add(3, "day").toISOString(),
			}),
		);

		await firemix().set(mixpath.members(uid), member);

		await handleInitialPurchase(
			buildRevenueCatEvent({ userId: uid, type: "INITIAL_PURCHASE" }),
		);

		const snap = await firemix().get(mixpath.members(uid));
		expect(snap?.data.plan).toBe("pro");
		expect(snap?.data.isOnTrial).toBe(false);
		expect(snap?.data.trialEndsAt).toBeNull();

		const user = await admin.auth().getUser(uid);
		expect(user.customClaims?.subscribed).toBe(true);
	});

	it("should skip upgrade if member already has active paid subscription", async () => {
		const uid = await createAdminUser();
		const member = memberToDatabase(
			buildMember({ id: uid, plan: "pro", isOnTrial: false }),
		);

		await firemix().set(mixpath.members(uid), member);

		await handleInitialPurchase(
			buildRevenueCatEvent({ userId: uid, type: "RENEWAL" }),
		);

		const snap = await firemix().get(mixpath.members(uid));
		expect(snap?.data.plan).toBe("pro");
		expect(snap?.data.isOnTrial).toBe(false);
	});

	it("should initialize member if none exists", async () => {
		const uid = await createAdminUser();

		await handleInitialPurchase(
			buildRevenueCatEvent({ userId: uid, type: "INITIAL_PURCHASE" }),
		);

		const snap = await firemix().get(mixpath.members(uid));
		expect(snap?.data.plan).toBe("pro");
		expect(snap?.data.isOnTrial).toBe(false);

		const user = await admin.auth().getUser(uid);
		expect(user.customClaims?.subscribed).toBe(true);
	});
});

describe("handleExpiration", () => {
	it("should downgrade a pro member to free", async () => {
		const uid = await createAdminUser();
		const member = memberToDatabase(
			buildMember({ id: uid, plan: "pro", isOnTrial: false }),
		);

		await firemix().set(mixpath.members(uid), member);

		await handleExpiration(
			buildRevenueCatEvent({ userId: uid, type: "EXPIRATION" }),
		);

		const snap = await firemix().get(mixpath.members(uid));
		expect(snap?.data.plan).toBe("free");

		const user = await admin.auth().getUser(uid);
		expect(user.customClaims?.subscribed).toBe(false);
	});

	it("should initialize member if none exists and set to free", async () => {
		const uid = await createAdminUser();

		await handleExpiration(
			buildRevenueCatEvent({ userId: uid, type: "CANCELLATION" }),
		);

		const snap = await firemix().get(mixpath.members(uid));
		expect(snap?.data.plan).toBe("free");

		const user = await admin.auth().getUser(uid);
		expect(user.customClaims?.subscribed).toBe(false);
	});
});
