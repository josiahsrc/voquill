import { FiremixTimestamp } from "@firemix/core";
import type { Nullable } from "./common.types";

export type MemberPlan = "free" | "pro";

export type Member = {
  id: string;
  type: "user";
  createdAt: FiremixTimestamp;
  updatedAt: FiremixTimestamp;
  plan: MemberPlan;
  stripeCustomerId?: Nullable<string>;
  priceId?: Nullable<string>;
  wordsToday: number;
  wordsThisMonth: number;
  wordsTotal: number;
  tokensToday: number;
  tokensThisMonth: number;
  tokensTotal: number;
  todayResetAt: FiremixTimestamp;
  thisMonthResetAt: FiremixTimestamp;
};
