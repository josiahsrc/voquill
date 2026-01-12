export type PriceInfo = {
  sandboxId: string;
  devId: string;
  prodId: string;
};

export const SUBSCRIPTION_PRICE_KEYS = [] as const;

export type SubscriptionPriceKey = (typeof SUBSCRIPTION_PRICE_KEYS)[number];

export const ONE_TIME_PRICE_KEYS = ["pro_monthly", "pro_yearly"] as const;

export type OneTimePriceKey = (typeof ONE_TIME_PRICE_KEYS)[number];

export const PRICE_KEYS = [
  ...SUBSCRIPTION_PRICE_KEYS,
  ...ONE_TIME_PRICE_KEYS,
] as const;

export type PriceKey = (typeof PRICE_KEYS)[number];

export const Prices: Record<PriceKey, PriceInfo> = {
  pro_monthly: {
    sandboxId: "price_1Smx96RRNItZsxS6WXTeWby3",
    devId: "",
    prodId: "price_1Son5zIp7DaYKUgMEMMuBNcy",
  },
  pro_yearly: {
    sandboxId: "price_1Smx9IRRNItZsxS6BG3XnnhL",
    devId: "",
    prodId: "price_1SmiviIp7DaYKUgMlbjqI23J",
  },
};

export const priceKeyById: Record<string, PriceKey> = Object.fromEntries([
  ...Object.entries(Prices).map(([key, value]) => [value.sandboxId, key]),
  ...Object.entries(Prices).map(([key, value]) => [value.prodId, key]),
]) as Record<string, PriceKey>;
