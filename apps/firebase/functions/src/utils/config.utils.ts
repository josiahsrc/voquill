import { FullConfig } from "@repo/types";

export const getFullConfig = (): FullConfig => {
	return {
		freeWordsPerDay: 2_000,
		freeWordsPerMonth: 2_000,
		freeTokensPerDay: 5_000,
		freeTokensPerMonth: 5_000,
		proWordsPerDay: 20_000,
		proWordsPerMonth: 1_000_000,
		proTokensPerDay: 50_000,
		proTokensPerMonth: 2_500_000,
	};
};
