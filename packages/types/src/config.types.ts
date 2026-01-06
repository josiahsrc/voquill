export type FullConfig = {
  freeWordsPerDay: number;
  freeWordsPerMonth: number;
  freeTokensPerDay: number;
  freeTokensPerMonth: number;
  proWordsPerDay: number;
  proWordsPerMonth: number;
  proTokensPerDay: number;
  proTokensPerMonth: number;
};

const FREE_WORDS_PER_DAY = 1_000;
const FREE_TOKENS_PER_DAY = FREE_WORDS_PER_DAY * 100;
const PRO_WORDS_PER_DAY = 50_000;
const PRO_TOKENS_PER_DAY = PRO_WORDS_PER_DAY * 100;

export const FULL_CONFIG: FullConfig = {
  freeWordsPerDay: FREE_WORDS_PER_DAY,
  freeWordsPerMonth: FREE_WORDS_PER_DAY * 20,
  freeTokensPerDay: FREE_TOKENS_PER_DAY,
  freeTokensPerMonth: FREE_TOKENS_PER_DAY * 20,
  proWordsPerDay: PRO_WORDS_PER_DAY,
  proWordsPerMonth: PRO_WORDS_PER_DAY * 20,
  proTokensPerDay: PRO_TOKENS_PER_DAY,
  proTokensPerMonth: PRO_TOKENS_PER_DAY * 20,
};
