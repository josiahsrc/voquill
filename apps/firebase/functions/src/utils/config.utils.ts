import { FullConfig } from "@repo/types";

const FREE_WORDS_PER_DAY = 1_000;
const FREE_TOKENS_PER_DAY = 50_000;
const PRO_WORDS_PER_DAY = 20_000;
const PRO_TOKENS_PER_DAY = 50_000;

export const getFullConfig = (): FullConfig => {
	return {
		freeWordsPerDay: FREE_WORDS_PER_DAY,
		freeWordsPerMonth: FREE_WORDS_PER_DAY * 20,
		freeTokensPerDay: FREE_TOKENS_PER_DAY,
		freeTokensPerMonth: FREE_TOKENS_PER_DAY * 20,
		proWordsPerDay: PRO_WORDS_PER_DAY,
		proWordsPerMonth: PRO_WORDS_PER_DAY * 20,
		proTokensPerDay: PRO_TOKENS_PER_DAY,
		proTokensPerMonth: PRO_TOKENS_PER_DAY * 20,
	};
};
