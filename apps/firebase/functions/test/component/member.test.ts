import dayjs from "dayjs";
import { blaze, invokeHandler, path, retry } from "../../src/shared";
import { buildMember } from "../../src/shared/entities";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

describe("tryInitializeMember", () => {
	it("works", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);

		// auth creates the member as a fallback
		await retry(
			async () => {
				const memberSnap = await blaze().get(path.members(creds.id));
				expect(memberSnap).toBeDefined();
				expect(memberSnap?.data).toBeDefined();
				expect(memberSnap?.data.id).toBe(creds.id);
			},
			10,
			100
		);

		// delete the member
		await blaze().delete(path.members(creds.id));

		// confirm it's deleted
		const prevMemberSnap = await blaze().get(path.members(creds.id));
		expect(prevMemberSnap).toBeNull();

		// call tryInitializeMember directly
		await expect(
			invokeHandler("member/tryInitialize", {})
		).resolves.not.toThrow();

		// confirm the member is re-created
		const memberSnap = await blaze().get(path.members(creds.id));
		expect(memberSnap).toBeDefined();
		expect(memberSnap?.data).toBeDefined();
		expect(memberSnap?.data.id).toBe(creds.id);
	});
});

describe("resetWordsTodayCron", () => {
	it("should work", async () => {
		const expiredMember = buildMember({
			id: blaze().id(),
			wordsToday: 100,
			wordsTodayResetAt: blaze().timestampFromDate(
				dayjs().subtract(1, "day").toDate()
			),
		});

		const notExpiredMember = buildMember({
			id: blaze().id(),
			wordsToday: 50,
			wordsTodayResetAt: blaze().timestampFromDate(
				dayjs().add(1, "day").toDate()
			),
		});

		await blaze().set(path.members(expiredMember.id), expiredMember);
		await blaze().set(path.members(notExpiredMember.id), notExpiredMember);

		await invokeHandler("emulator/resetWordsToday", {});

		await retry(
			async () => {
				const expiredMemberSnap = await blaze().get(
					path.members(expiredMember.id)
				);

				// expired member should be reset
				expect(expiredMemberSnap?.data.wordsToday).toBe(0);
				expect(
					expiredMemberSnap?.data.wordsTodayResetAt.toMillis()
				).toBeGreaterThanOrEqual(
					dayjs().add(1, "day").subtract(1, "minute").toDate().getTime()
				);
				expect(
					expiredMemberSnap?.data.wordsTodayResetAt.toMillis()
				).toBeLessThanOrEqual(
					dayjs().add(1, "day").add(1, "minute").toDate().getTime()
				);

				// non expired member should not be changed
				const notExpiredMemberSnap = await blaze().get(
					path.members(notExpiredMember.id)
				);
				expect(notExpiredMemberSnap?.data.wordsToday).toBe(50);
				expect(
					notExpiredMemberSnap?.data.wordsThisMonthResetAt.toMillis()
				).toEqual(notExpiredMember.wordsThisMonthResetAt.toMillis());
			},
			10,
			1000
		);
	});
});

describe("resetWordsThisMonthCron", () => {
	it("should work", async () => {
		const expiredMember = buildMember({
			id: blaze().id(),
			wordsThisMonth: 5000,
			wordsThisMonthResetAt: blaze().timestampFromDate(
				dayjs().subtract(1, "month").toDate()
			),
		});

		const notExpiredMember = buildMember({
			id: blaze().id(),
			wordsThisMonth: 2500,
			wordsThisMonthResetAt: blaze().timestampFromDate(
				dayjs().add(1, "month").toDate()
			),
		});

		await blaze().set(path.members(expiredMember.id), expiredMember);
		await blaze().set(path.members(notExpiredMember.id), notExpiredMember);

		await invokeHandler("emulator/resetWordsThisMonth", {});

		await retry(
			async () => {
				const expiredMemberSnap = await blaze().get(
					path.members(expiredMember.id)
				);

				// expired member should be reset
				expect(expiredMemberSnap?.data.wordsThisMonth).toBe(0);
				expect(
					expiredMemberSnap?.data.wordsThisMonthResetAt.toMillis()
				).toBeGreaterThanOrEqual(
					dayjs().add(1, "month").subtract(1, "minute").toDate().getTime()
				);
				expect(
					expiredMemberSnap?.data.wordsThisMonthResetAt.toMillis()
				).toBeLessThanOrEqual(
					dayjs().add(1, "month").add(1, "minute").toDate().getTime()
				);

				// non expired member should not be changed
				const notExpiredMemberSnap = await blaze().get(
					path.members(notExpiredMember.id)
				);
				expect(notExpiredMemberSnap?.data.wordsThisMonth).toBe(2500);
				expect(
					notExpiredMemberSnap?.data.wordsThisMonthResetAt.toMillis()
				).toEqual(notExpiredMember.wordsThisMonthResetAt.toMillis());
			},
			10,
			1000
		);
	});
});

describe("firestore rules", () => {
	let userId: string;

	beforeEach(async () => {
		const creds = await createUserCreds();
		const user = await signInWithCreds(creds);

		const member = buildMember({ id: user.uid, userIds: [user.uid] });
		await blaze().set(path.members(user.uid), member);

		userId = user.uid;
	});

	it("lets me read my memberships", async () => {
		await expect(
			blaze("client").query(path.members(), [
				"userIds",
				"array-contains",
				userId,
			])
		).resolves.not.toThrow();
	});

	it("prevents listing other members", async () => {
		await expect(
			blaze("client").query(path.members(), [
				"userIds",
				"array-contains",
				"differentUserId",
			])
		).rejects.toThrow();
	});

	it("prevents me from spoofing my membership", async () => {
		await expect(
			blaze("client").update(path.members(userId), {
				userIds: ["differentUserId"],
			})
		).rejects.toThrow();
		await expect(
			blaze("client").update(path.members(userId), {
				plan: "pro",
			})
		).rejects.toThrow();
	});
});
