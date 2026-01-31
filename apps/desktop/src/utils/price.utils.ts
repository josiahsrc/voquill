import type { HandlerOutput } from "@repo/functions";
import { PRICE_KEYS, Prices, type PriceKey } from "@repo/pricing";
import { MemberPlan } from "@repo/types";
import { getRec } from "@repo/utilities";
import { getStripeRepo } from "../repos";
import type { AppState } from "../state/app.state";
import { isDev, isEmulators, isProd } from "./env.utils";

export const PRICING_PLANS = ["community", "free", ...PRICE_KEYS] as const;
export type PricingPlan = (typeof PRICING_PLANS)[number];

export const convertPricingPlanToMemberPlan = (
  plan: PricingPlan,
): MemberPlan => {
  if (plan === "pro_monthly" || plan === "pro_yearly") {
    return "pro";
  }
  return "free";
};

export const getPriceIdFromKey = (priceKey: PriceKey) => {
  const data = Prices[priceKey];
  if (isProd()) {
    return data.prodId;
  } else if (isDev()) {
    return data.devId;
  } else if (isEmulators()) {
    return data.sandboxId;
  }

  throw new Error("Unknown environment");
};

export const unitAmountToDollars = (
  unitAmount: number | null | undefined,
): number => {
  if (unitAmount == null) {
    return 0;
  }
  return unitAmount / 100;
};

export const getDollarPriceFromKey = (state: AppState, priceKey: PriceKey) => {
  const output = state.priceValueByKey;
  const price = getRec(output?.prices, getPriceIdFromKey(priceKey));
  return unitAmountToDollars(price?.unitAmount);
};

let lastPriceTime = 0;
let cachedPrices: HandlerOutput<"stripe/getPrices"> | null = null;
let pendingPromise: Promise<HandlerOutput<"stripe/getPrices">> | null = null;
const CACHE_DURATION = 60 * 1000;

export const getPricesWithRuntimeCaching = async () => {
  if (cachedPrices && Date.now() - lastPriceTime < CACHE_DURATION) {
    return cachedPrices;
  }

  if (pendingPromise) {
    return pendingPromise;
  }

  const pricesIds = [
    getPriceIdFromKey("pro_monthly"),
    getPriceIdFromKey("pro_yearly"),
  ];

  pendingPromise =
    getStripeRepo()?.getPrices(pricesIds) ?? Promise.resolve({ prices: {} });

  try {
    cachedPrices = await pendingPromise;
    lastPriceTime = Date.now();
    return cachedPrices;
  } finally {
    pendingPromise = null;
  }
};
