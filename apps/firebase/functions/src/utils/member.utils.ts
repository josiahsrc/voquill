import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { FullConfig, Member } from "@repo/types";
import { getWordLimit } from "./config.utils";

export const getMemberExceedsWordLimit = (
	member: Member,
	config: FullConfig
): boolean => {
	const limits = getWordLimit(config, member.plan);
	return (
		member.wordsToday >= limits.perDay ||
		member.wordsThisMonth >= limits.perMonth
	);
};


/** Transactional so that anyone can call this whenever they want */
export const tryInitializeMember = async (userId: string): Promise<void> => {
  await firemix().transaction(async (tx) => {
    const member = await tx.get(mixpath.members(userId));
    if (member) {
      console.log("member already exists, skipping initialization");
      return;
    }

    tx.set(mixpath.members(userId), {
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
