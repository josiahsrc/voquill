import { produceAppState } from "../store";
import { getPricesWithRuntimeCaching } from "../utils/price.utils";
import { showErrorSnackbar } from "./app.actions";

export const loadPrices = async () => {
  try {
    const prices = await getPricesWithRuntimeCaching();

    produceAppState((draft) => {
      draft.pricing.initialized = true;
      draft.priceValueByKey = prices;
    });
  } catch (error) {
    showErrorSnackbar(error);
    produceAppState((draft) => {
      draft.pricing.initialized = false;
    });
  }
};

export const openUpgradePlanDialog = () => {
  produceAppState((draft) => {
    draft.pricing.upgradePlanDialog = true;
  });
};

export const closeUpgradePlanDialog = () => {
  produceAppState((draft) => {
    draft.pricing.upgradePlanDialog = false;
  });
};
