import { PriceKey } from "@repo/pricing";
import { Nullable } from "@repo/types";
import { PricingPlan } from "../utils/price.utils";

export type PricingState = {
  priceKeys: PriceKey[];
  initialized: boolean;
  upgradePlanDialog: boolean;
  upgradePlanDialogView: "plans" | "login";
  upgradePlanPendingPlan: Nullable<PricingPlan>;
};

export const INITIAL_PRICING_STATE: PricingState = {
  priceKeys: ["pro_monthly"],
  initialized: false,
  upgradePlanDialog: false,
  upgradePlanDialogView: "plans",
  upgradePlanPendingPlan: null,
};
