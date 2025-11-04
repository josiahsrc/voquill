import { PriceKey } from "@repo/pricing";
import { MemberPlan, Nullable } from "@repo/types";

export type PricingState = {
  priceKeys: PriceKey[];
  initialized: boolean;
  upgradePlanDialog: boolean;
  upgradePlanDialogView: "plans" | "login";
  upgradePlanPendingPlan: Nullable<MemberPlan>;
};

export const INITIAL_PRICING_STATE: PricingState = {
  priceKeys: ["pro_monthly"],
  initialized: false,
  upgradePlanDialog: false,
  upgradePlanDialogView: "plans",
  upgradePlanPendingPlan: null,
};
