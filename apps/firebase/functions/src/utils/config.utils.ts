import { FullConfig } from "@repo/types";

export const getFullConfig = (): FullConfig => {
  return {
    freeWordsPerDay: 0,
    freeWordsPerMonth: 0,
    freeTokensPerDay: 0,
    freeTokensPerMonth: 0,
    proWordsPerDay: 20_000,
    proWordsPerMonth: 1_000_000,
    proTokensPerDay: 50_000,
    proTokensPerMonth: 2_500_000,
  };
};

