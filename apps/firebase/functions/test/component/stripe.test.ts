import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import dayjs from "dayjs";
import stripe from "stripe";
import {
	handleSubscriptionCreated,
	handleSubscriptionDeleted,
} from "../../src/services/stripe.service";
import { memberToDatabase } from "../../src/utils/type.utils";
import { buildMember } from "../helpers/entities";
import { createUserCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

const buildSubscriptionEvent = (opts: {
	userId: string;
	priceId: string;
	customerId: string;
}) => {
	return {
		data: {
			object: {
				metadata: { userId: opts.userId },
				items: {
					data: [{ price: { id: opts.priceId } }],
				},
				customer: opts.customerId,
			},
		},
	} as unknown as stripe.CustomerSubscriptionCreatedEvent;
};

describe("handleSubscriptionCreated", () => {
	it("should clear trial state when a trial user subscribes", async () => {
		const creds = await createUserCreds();
		const trialMember = memberToDatabase(
			buildMember({
				id: creds.id,
				plan: "pro",
				isOnTrial: true,
				trialEndsAt: dayjs().add(3, "day").toISOString(),
			}),
		);

		await firemix().set(mixpath.members(creds.id), trialMember);

		const event = buildSubscriptionEvent({
			userId: creds.id,
			priceId: "price_test_123",
			customerId: "cus_test_123",
		});

		await handleSubscriptionCreated(event);

		const memberSnap = await firemix().get(mixpath.members(creds.id));
		expect(memberSnap?.data.plan).toBe("pro");
		expect(memberSnap?.data.isOnTrial).toBe(false);
		expect(memberSnap?.data.trialEndsAt).toBeNull();
		expect(memberSnap?.data.priceId).toBe("price_test_123");
		expect(memberSnap?.data.stripeCustomerId).toBe("cus_test_123");
	});

	it("should set plan to pro for a free member", async () => {
		const creds = await createUserCreds();
		const freeMember = memberToDatabase(
			buildMember({
				id: creds.id,
				plan: "free",
				isOnTrial: false,
				trialEndsAt: undefined,
			}),
		);

		await firemix().set(mixpath.members(creds.id), freeMember);

		const event = buildSubscriptionEvent({
			userId: creds.id,
			priceId: "price_test_456",
			customerId: "cus_test_456",
		});

		await handleSubscriptionCreated(event);

		const memberSnap = await firemix().get(mixpath.members(creds.id));
		expect(memberSnap?.data.plan).toBe("pro");
		expect(memberSnap?.data.isOnTrial).toBe(false);
		expect(memberSnap?.data.trialEndsAt).toBeNull();
		expect(memberSnap?.data.priceId).toBe("price_test_456");
		expect(memberSnap?.data.stripeCustomerId).toBe("cus_test_456");
	});

	it("should set plan to pro for a member without trial fields", async () => {
		const creds = await createUserCreds();
		const member = memberToDatabase(
			buildMember({
				id: creds.id,
				plan: "free",
				isOnTrial: undefined,
				trialEndsAt: undefined,
			}),
		);

		await firemix().set(mixpath.members(creds.id), member);

		const event = buildSubscriptionEvent({
			userId: creds.id,
			priceId: "price_test_789",
			customerId: "cus_test_789",
		});

		await handleSubscriptionCreated(event);

		const memberSnap = await firemix().get(mixpath.members(creds.id));
		expect(memberSnap?.data.plan).toBe("pro");
		expect(memberSnap?.data.isOnTrial).toBe(false);
		expect(memberSnap?.data.priceId).toBe("price_test_789");
	});
});

describe("handleSubscriptionDeleted", () => {
	it("should revert a subscribed member to free plan", async () => {
		const creds = await createUserCreds();
		const member = memberToDatabase(
			buildMember({
				id: creds.id,
				plan: "pro",
				isOnTrial: false,
				priceId: "price_test_del",
				stripeCustomerId: "cus_test_del",
			}),
		);

		await firemix().set(mixpath.members(creds.id), member);

		const event = {
			data: {
				object: {
					metadata: { userId: creds.id },
				},
			},
		} as unknown as stripe.CustomerSubscriptionDeletedEvent;

		await handleSubscriptionDeleted(event);

		const memberSnap = await firemix().get(mixpath.members(creds.id));
		expect(memberSnap?.data.plan).toBe("free");
		expect(memberSnap?.data.priceId).toBeNull();
	});
});
