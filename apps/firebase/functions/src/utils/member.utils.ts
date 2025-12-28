import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { DatabaseMember } from "@repo/types";

/** Transactional so that anyone can call this whenever they want */
export const tryInitializeMember = async (
	userId: string,
): Promise<DatabaseMember> => {
	return await firemix().transaction(async (tx) => {
		const member = await tx.get(mixpath.members(userId));
		if (member) {
			console.log("member already exists, skipping initialization");
			return member.data;
		}

		const newMember: DatabaseMember = {
			id: userId,
			createdAt: firemix().now(),
			updatedAt: firemix().now(),
			type: "user",
			plan: "free",
			todayResetAt: firemix().now(),
			thisMonthResetAt: firemix().now(),
			wordsToday: 0,
			wordsThisMonth: 0,
			wordsTotal: 0,
			tokensToday: 0,
			tokensThisMonth: 0,
			tokensTotal: 0,
		};

		tx.set(mixpath.members(userId), newMember);
		console.log("initialized new member with userId", userId);
		return newMember;
	});
};
