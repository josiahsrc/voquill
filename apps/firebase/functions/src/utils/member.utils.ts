import { blaze, path } from "../shared";

/** Transactional so that anyone can call this whenever they want */
export const tryInitializeMember = async (userId: string): Promise<void> => {
	await firemix().transaction(async (tx) => {
		const member = await tx.get(path.members(userId));
		if (member) {
			console.log("member already exists, skipping initialization");
			return;
		}

		tx.set(path.members(userId), {
			id: userId,
			createdAt: firemix().now(),
			updatedAt: firemix().now(),
			type: "user",
			userIds: [userId],
			plan: "free",
			wordsToday: 0,
			wordsTodayResetAt: firemix().now(),
			wordsThisMonth: 0,
			wordsThisMonthResetAt: firemix().now(),
			wordsTotal: 0,
		});
	});
};
