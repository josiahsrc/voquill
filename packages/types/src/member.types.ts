import { FiremixTimestamp } from "@firemix/core";
import type { Nullable, Replace } from "./common.types";

export type MemberPlan = "free" | "pro";

export type DatabaseMember = {
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
  isOnTrial?: Nullable<boolean>;
  trialEndsAt?: Nullable<FiremixTimestamp>;
};

export type Member = Replace<DatabaseMember, FiremixTimestamp, string>;
