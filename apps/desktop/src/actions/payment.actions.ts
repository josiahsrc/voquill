import { MemberPlan } from "@repo/types";
import { produceAppState } from "../store";
import { getPriceIdFromKey } from "../utils/price.utils";

export const openPaymentDialog = (priceId: string) => {
  produceAppState((draft) => {
    draft.payment.open = true;
    draft.payment.priceId = priceId;
  });
};

export const tryOpenPaymentDialogForPlan = (
  plan?: MemberPlan | string | null,
): boolean => {
  if (plan === "pro") {
    openPaymentDialog(getPriceIdFromKey("pro_monthly"));
    return true;
  }

  return false;
};
