import { produceAppState } from "../store";
import {
  getPriceIdFromKey,
  PRICING_PLANS,
  PricingPlan,
} from "../utils/price.utils";

export const openPaymentDialog = (priceId: string) => {
  produceAppState((draft) => {
    draft.payment.open = true;
    draft.payment.priceId = priceId;
  });
};

export const tryOpenPaymentDialogForPricingPlan = (
  plan?: PricingPlan | string | null,
): boolean => {
  const castedPlan = plan as PricingPlan | undefined;
  if (!castedPlan || !PRICING_PLANS.includes(castedPlan)) {
    return false;
  }

  if (
    castedPlan === "free" ||
    castedPlan === "community" ||
    castedPlan === "enterprise"
  ) {
    return false;
  }

  openPaymentDialog(getPriceIdFromKey(castedPlan));
  return true;
};
