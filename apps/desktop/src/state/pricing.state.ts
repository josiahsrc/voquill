import { PriceKey } from "@repo/pricing";

export type PricingState = {
  priceKeys: PriceKey[];
  initialized: boolean;
  upgradePlanDialog?: boolean;
};

export const INITIAL_PRICING_STATE: PricingState = {
  priceKeys: ["pro_monthly"],
  initialized: false,
  upgradePlanDialog: false,
};
