import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { FullConfig, MemberPlan, Nullable, PartialConfig } from "@repo/types";

export const getFullConfig = (config?: Nullable<PartialConfig>): FullConfig => {
  return {
    freeWordsPerDay: config?.freeWordsPerDay ?? 0,
    freeWordsPerMonth: config?.freeWordsPerMonth ?? 0,
    freeTokensPerDay: config?.freeTokensPerDay ?? 0,
    freeTokensPerMonth: config?.freeTokensPerMonth ?? 0,
    proWordsPerDay: config?.proWordsPerDay ?? 20_000,
    proWordsPerMonth: config?.proWordsPerMonth ?? 1_000_000,
    proTokensPerDay: config?.proTokensPerDay ?? 50_000,
    proTokensPerMonth: config?.proTokensPerMonth ?? 2_500_000,
  };
};

export const loadFullConfig = async (): Promise<FullConfig> => {
  const partialConfig = await firemix().get(mixpath.systemConfig());
  return getFullConfig(partialConfig?.data);
};

export type Limit = {
  perDay: number;
  perMonth: number;
};

export const getWordLimit = (
  config: FullConfig,
  plan: MemberPlan,
): Limit => {
  if (plan === "pro") {
    return {
      perDay: config.proWordsPerDay,
      perMonth: config.proWordsPerMonth,
    };
  } else {
    return {
      perDay: config.freeWordsPerDay,
      perMonth: config.freeWordsPerMonth,
    };
  }
};

export const getTokenLimit = (
  config: FullConfig,
  plan: MemberPlan,
): Limit => {
  if (plan === "pro") {
    return {
      perDay: config.proTokensPerDay,
      perMonth: config.proTokensPerMonth,
    };
  } else {
    return {
      perDay: config.freeTokensPerDay,
      perMonth: config.freeTokensPerMonth,
    };
  }
};
