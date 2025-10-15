import { BlazeTimestamp } from "../blaze";
import type { Nullable } from "./common.types";

export type MemberPlan = "free" | "pro";

export type Member = {
	id: string;
	type: "user";
	userIds: string[];
	createdAt: BlazeTimestamp;
	updatedAt: BlazeTimestamp;
	plan: MemberPlan;
	stripeCustomerId?: Nullable<string>;
	priceId?: Nullable<string>;
	wordsToday: number;
	wordsTodayResetAt: BlazeTimestamp;
	wordsThisMonth: number;
	wordsThisMonthResetAt: BlazeTimestamp;
	wordsTotal: number;
};
