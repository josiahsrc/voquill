import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { invokeHandler } from "@repo/functions";
import { retry } from "@repo/utilities";
import dayjs from "dayjs";
import { memberToDatabase, userToDatabase } from "../../src/utils/type.utils";
import { buildMember, buildUser } from "../helpers/entities";
import {
	createUserCreds,
	markUserAsSubscribed,
	signInWithCreds,
} from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

describe("tryInitializeMember", () => {
	it("works", async () => {
		const creds = await createUserCreds();
		await markUserAsSubscribed();
		await signInWithCreds(creds);

		// auth creates the member as a fallback
		await retry({
			fn: async () => {
				const memberSnap = await firemix().get(mixpath.members(creds.id));
				expect(memberSnap).toBeDefined();
				expect(memberSnap?.data).toBeDefined();
				expect(memberSnap?.data.id).toBe(creds.id);
			},
			retries: 10,
			delay: 100,
		});

		// delete the member
		await firemix().delete(mixpath.members(creds.id));

		// confirm it's deleted
		const prevMemberSnap = await firemix().get(mixpath.members(creds.id));
		expect(prevMemberSnap).toBeNull();

		// call tryInitializeMember directly
		await expect(
			invokeHandler("member/tryInitialize", {}),
		).resolves.not.toThrow();

		// confirm the member is re-created
		const memberSnap = await firemix().get(mixpath.members(creds.id));
		expect(memberSnap).toBeDefined();
		expect(memberSnap?.data).toBeDefined();
		expect(memberSnap?.data.id).toBe(creds.id);
	});

	it("initializes new members with pro trial", async () => {
		const creds = await createUserCreds();
		await markUserAsSubscribed();
		await signInWithCreds(creds);

		// wait for auth to create the member
		await retry({
			fn: async () => {
				const memberSnap = await firemix().get(mixpath.members(creds.id));
				expect(memberSnap).toBeDefined();
			},
			retries: 10,
			delay: 100,
		});

		// delete the member so we can test initialization
		await firemix().delete(mixpath.members(creds.id));

		// call tryInitializeMember
		await invokeHandler("member/tryInitialize", {});

		// verify the member is created with pro trial
		const memberSnap = await firemix().get(mixpath.members(creds.id));
		expect(memberSnap?.data.plan).toBe("pro");
		expect(memberSnap?.data.isOnTrial).toBe(true);
		expect(memberSnap?.data.trialEndsAt).toBeDefined();

		const trialEndsAt = memberSnap?.data.trialEndsAt?.toMillis();
		const oneWeekFromNow = dayjs().add(1, "week");
		expect(trialEndsAt).toBeGreaterThanOrEqual(
			oneWeekFromNow.subtract(1, "minute").toDate().getTime(),
		);
		expect(trialEndsAt).toBeLessThanOrEqual(
			oneWeekFromNow.add(1, "minute").toDate().getTime(),
		);
	});

	it("does not reset existing member to pro trial", async () => {
		const creds = await createUserCreds();
		await markUserAsSubscribed();
		await signInWithCreds(creds);

		// wait for auth to create the member
		await retry({
			fn: async () => {
				const memberSnap = await firemix().get(mixpath.members(creds.id));
				expect(memberSnap).toBeDefined();
			},
			retries: 10,
			delay: 100,
		});

		// delete the member and create a free member manually
		await firemix().delete(mixpath.members(creds.id));

		const freeMember = memberToDatabase(
			buildMember({
				id: creds.id,
				plan: "free",
				isOnTrial: false,
				trialEndsAt: undefined,
			}),
		);
		await firemix().set(mixpath.members(creds.id), freeMember);

		// call tryInitializeMember
		await invokeHandler("member/tryInitialize", {});

		// verify the member was NOT changed to pro trial
		const memberSnap = await firemix().get(mixpath.members(creds.id));
		expect(memberSnap?.data.plan).toBe("free");
		expect(memberSnap?.data.isOnTrial).toBe(false);
		expect(memberSnap?.data.trialEndsAt).toBeFalsy();
	});
});

describe("resetWordsTodayCron", () => {
	it("should work", async () => {
		const expiredMember = memberToDatabase(
			buildMember({
				id: firemix().id(),
				wordsToday: 100,
				todayResetAt: dayjs().subtract(1, "day").toISOString(),
			}),
		);

		const notExpiredMember = memberToDatabase(
			buildMember({
				id: firemix().id(),
				wordsToday: 50,
				todayResetAt: dayjs().add(1, "day").toISOString(),
			}),
		);

		await firemix().set(mixpath.members(expiredMember.id), expiredMember);
		await firemix().set(mixpath.members(notExpiredMember.id), notExpiredMember);

		await invokeHandler("emulator/resetWordsToday", {});

		await retry({
			fn: async () => {
				const expiredMemberSnap = await firemix().get(
					mixpath.members(expiredMember.id),
				);

				// expired member should be reset
				expect(expiredMemberSnap?.data.wordsToday).toBe(0);
				expect(
					expiredMemberSnap?.data.todayResetAt.toMillis(),
				).toBeGreaterThanOrEqual(
					dayjs().add(1, "day").subtract(1, "minute").toDate().getTime(),
				);
				expect(
					expiredMemberSnap?.data.todayResetAt.toMillis(),
				).toBeLessThanOrEqual(
					dayjs().add(1, "day").add(1, "minute").toDate().getTime(),
				);

				// non expired member should not be changed
				const notExpiredMemberSnap = await firemix().get(
					mixpath.members(notExpiredMember.id),
				);
				expect(notExpiredMemberSnap?.data.wordsToday).toBe(50);
				expect(
					notExpiredMemberSnap?.data.thisMonthResetAt?.toDate().toISOString(),
				).toEqual(notExpiredMember.thisMonthResetAt?.toDate().toISOString());
			},
			retries: 10,
			delay: 1000,
		});
	});
});

describe("resetWordsThisMonthCron", () => {
	it("should work", async () => {
		const expiredMember = memberToDatabase(
			buildMember({
				id: firemix().id(),
				wordsThisMonth: 5000,
				thisMonthResetAt: dayjs().subtract(1, "month").toISOString(),
			}),
		);

		const notExpiredMember = memberToDatabase(
			buildMember({
				id: firemix().id(),
				wordsThisMonth: 2500,
				thisMonthResetAt: dayjs().add(1, "month").toISOString(),
			}),
		);

		await firemix().set(mixpath.members(expiredMember.id), expiredMember);
		await firemix().set(mixpath.members(notExpiredMember.id), notExpiredMember);

		await invokeHandler("emulator/resetWordsThisMonth", {});

		await retry({
			fn: async () => {
				const expiredMemberSnap = await firemix().get(
					mixpath.members(expiredMember.id),
				);

				// expired member should be reset
				expect(expiredMemberSnap?.data.wordsThisMonth).toBe(0);
				expect(
					expiredMemberSnap?.data.thisMonthResetAt.toMillis(),
				).toBeGreaterThanOrEqual(
					dayjs().add(1, "month").subtract(1, "minute").toDate().getTime(),
				);
				expect(
					expiredMemberSnap?.data.thisMonthResetAt.toMillis(),
				).toBeLessThanOrEqual(
					dayjs().add(1, "month").add(1, "minute").toDate().getTime(),
				);

				// non expired member should not be changed
				const notExpiredMemberSnap = await firemix().get(
					mixpath.members(notExpiredMember.id),
				);
				expect(notExpiredMemberSnap?.data.wordsThisMonth).toBe(2500);
				expect(
					notExpiredMemberSnap?.data.thisMonthResetAt.toDate().toISOString(),
				).toEqual(notExpiredMember.thisMonthResetAt.toDate().toISOString());
			},
			retries: 10,
			delay: 1000,
		});
	});
});

describe("cancelProTrialsCron", () => {
	it("should cancel expired pro trials and update user document", async () => {
		const memberId = firemix().id();
		const expiredTrialMember = memberToDatabase(
			buildMember({
				id: memberId,
				plan: "pro",
				isOnTrial: true,
				trialEndsAt: dayjs().subtract(1, "hour").toISOString(),
			}),
		);

		const user = userToDatabase(
			buildUser({
				id: memberId,
				shouldShowUpgradeDialog: undefined,
			}),
		);

		await firemix().set(
			mixpath.members(expiredTrialMember.id),
			expiredTrialMember,
		);
		await firemix().set(mixpath.users(memberId), user);

		await invokeHandler("emulator/cancelProTrials", {});

		await retry({
			fn: async () => {
				const memberSnap = await firemix().get(
					mixpath.members(expiredTrialMember.id),
				);

				expect(memberSnap?.data.plan).toBe("free");
				expect(memberSnap?.data.isOnTrial).toBe(false);
				expect(memberSnap?.data.trialEndsAt?.toMillis()).toEqual(
					expiredTrialMember.trialEndsAt?.toMillis(),
				);

				const userSnap = await firemix().get(mixpath.users(memberId));
				expect(userSnap?.data.shouldShowUpgradeDialog).toBe(true);
			},
			retries: 10,
			delay: 1000,
		});
	});

	it("should handle when the user document does not exist", async () => {
		const memberId = firemix().id();
		const expiredTrialMember = memberToDatabase(
			buildMember({
				id: memberId,
				plan: "pro",
				isOnTrial: true,
				trialEndsAt: dayjs().subtract(1, "hour").toISOString(),
			}),
		);

		await firemix().set(
			mixpath.members(expiredTrialMember.id),
			expiredTrialMember,
		);

		// Ensure the user document does not exist
		await firemix()
			.delete(mixpath.users(memberId))
			.catch(() => {});

		await invokeHandler("emulator/cancelProTrials", {});
		const memberSnap = await firemix().get(
			mixpath.members(expiredTrialMember.id),
		);
		expect(memberSnap?.data.plan).toBe("free");
		expect(memberSnap?.data.isOnTrial).toBe(false);

		const userSnap = await firemix().get(mixpath.users(memberId));
		expect(userSnap?.data).toBeUndefined();
	});

	it("should not cancel active pro trials", async () => {
		const activeTrialMember = memberToDatabase(
			buildMember({
				id: firemix().id(),
				plan: "pro",
				isOnTrial: true,
				trialEndsAt: dayjs().add(1, "day").toISOString(),
			}),
		);

		await firemix().set(
			mixpath.members(activeTrialMember.id),
			activeTrialMember,
		);

		await invokeHandler("emulator/cancelProTrials", {});

		await retry({
			fn: async () => {
				const memberSnap = await firemix().get(
					mixpath.members(activeTrialMember.id),
				);

				expect(memberSnap?.data.plan).toBe("pro");
				expect(memberSnap?.data.isOnTrial).toBe(true);
				expect(memberSnap?.data.trialEndsAt?.toMillis()).toEqual(
					activeTrialMember.trialEndsAt?.toMillis(),
				);
			},
			retries: 10,
			delay: 1000,
		});
	});

	it("should not affect members without trial fields", async () => {
		const noTrialMember = memberToDatabase(
			buildMember({
				id: firemix().id(),
				plan: "pro",
				isOnTrial: undefined,
				trialEndsAt: undefined,
			}),
		);

		await firemix().set(mixpath.members(noTrialMember.id), noTrialMember);

		await invokeHandler("emulator/cancelProTrials", {});

		await retry({
			fn: async () => {
				const memberSnap = await firemix().get(
					mixpath.members(noTrialMember.id),
				);

				expect(memberSnap?.data.plan).toBe("pro");
				expect(memberSnap?.data.isOnTrial).toBeUndefined();
				expect(memberSnap?.data.trialEndsAt).toBeFalsy();
			},
			retries: 10,
			delay: 1000,
		});
	});

	it("should not affect free members without trial", async () => {
		const freeMember = memberToDatabase(
			buildMember({
				id: firemix().id(),
				plan: "free",
				isOnTrial: undefined,
				trialEndsAt: undefined,
			}),
		);

		await firemix().set(mixpath.members(freeMember.id), freeMember);

		await invokeHandler("emulator/cancelProTrials", {});

		await retry({
			fn: async () => {
				const memberSnap = await firemix().get(mixpath.members(freeMember.id));

				expect(memberSnap?.data.plan).toBe("free");
				expect(memberSnap?.data.isOnTrial).toBeUndefined();
				expect(memberSnap?.data.trialEndsAt).toBeFalsy();
			},
			retries: 10,
			delay: 1000,
		});
	});

	it("should not affect members with isOnTrial false", async () => {
		const notOnTrialMember = memberToDatabase(
			buildMember({
				id: firemix().id(),
				plan: "pro",
				isOnTrial: false,
				trialEndsAt: dayjs().subtract(1, "hour").toISOString(),
			}),
		);

		await firemix().set(mixpath.members(notOnTrialMember.id), notOnTrialMember);

		await invokeHandler("emulator/cancelProTrials", {});

		await retry({
			fn: async () => {
				const memberSnap = await firemix().get(
					mixpath.members(notOnTrialMember.id),
				);

				expect(memberSnap?.data.plan).toBe("pro");
				expect(memberSnap?.data.isOnTrial).toBe(false);
			},
			retries: 10,
			delay: 1000,
		});
	});
});

describe("api", () => {
	it("lets me manage my member", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();
		await invokeHandler("member/tryInitialize", {});
		const myMember = await invokeHandler("member/getMyMember", {}).then(
			(res) => res.member,
		);
		expect(myMember).not.toBeNull();
		expect(myMember?.id).toBe(creds.id);
	});
});
