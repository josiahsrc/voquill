import type { Nullable, MemberPlan } from "@repo/types";

export type MemberRow = {
  id: string;
  type: string;
  created_at: Date;
  updated_at: Date;
  plan: MemberPlan;
  stripe_customer_id: Nullable<string>;
  price_id: Nullable<string>;
  words_today: number;
  words_this_month: number;
  words_total: number;
  tokens_today: number;
  tokens_this_month: number;
  tokens_total: number;
  today_reset_at: Date;
  this_month_reset_at: Date;
  is_on_trial: Nullable<boolean>;
  trial_ends_at: Nullable<Date>;
};
