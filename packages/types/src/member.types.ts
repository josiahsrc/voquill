import { FiremixTimestamp } from "@firemix/core";
import type { Nullable } from "./common.types";

export type MemberPlan = "free" | "pro";

export type Member = {
  id: string;
  type: "user";
  userIds: string[];
  createdAt: FiremixTimestamp;
  updatedAt: FiremixTimestamp;
  plan: MemberPlan;
  stripeCustomerId?: Nullable<string>;
  priceId?: Nullable<string>;
  wordsToday: number;
  wordsTodayResetAt: FiremixTimestamp;
  wordsThisMonth: number;
  wordsThisMonthResetAt: FiremixTimestamp;
  wordsTotal: number;
};
