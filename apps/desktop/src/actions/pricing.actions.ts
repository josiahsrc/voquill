import { MemberPlan } from "@repo/types";
import { getAppState, produceAppState } from "../store";
import { getPricesWithRuntimeCaching } from "../utils/price.utils";
import { setMode } from "./login.actions";

export const loadPrices = async () => {
  try {
    const prices = await getPricesWithRuntimeCaching();

    produceAppState((draft) => {
      draft.pricing.initialized = true;
      draft.priceValueByKey = prices;
    });
  } catch {
    produceAppState((draft) => {
      draft.pricing.initialized = false;
    });
  }
};

export const openUpgradePlanDialog = () => {
  produceAppState((draft) => {
    draft.pricing.upgradePlanDialog = true;
    draft.pricing.upgradePlanDialogView = "plans";
    draft.pricing.upgradePlanPendingPlan = null;
  });
};

export const closeUpgradePlanDialog = () => {
  produceAppState((draft) => {
    draft.pricing.upgradePlanDialog = false;
    draft.pricing.upgradePlanDialogView = "plans";
    draft.pricing.upgradePlanPendingPlan = null;
  });
};

export const showUpgradePlanList = () => {
  produceAppState((draft) => {
    draft.pricing.upgradePlanDialogView = "plans";
    draft.pricing.upgradePlanPendingPlan = null;
  });
};

export const selectUpgradePlan = (plan: MemberPlan) => {
  const state = getAppState();
  if (!state.auth) {
    produceAppState((draft) => {
      draft.pricing.upgradePlanDialogView = "login";
      draft.pricing.upgradePlanPendingPlan = plan;
    });
    setMode("signIn");
  } else {
    produceAppState((draft) => {
      draft.pricing.upgradePlanPendingPlan = plan;
    });
  }
};
