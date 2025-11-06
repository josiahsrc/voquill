import { FullConfig, Nullable, PartialConfig } from "@repo/types";

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
