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

const TOKEN_MULT = 18;
const MONTH_MULT = 30;
const FREE_WORDS_PER_DAY = 1_000;
const FREE_TOKENS_PER_DAY = FREE_WORDS_PER_DAY * TOKEN_MULT;
const PRO_WORDS_PER_DAY = 15_000;
const PRO_TOKENS_PER_DAY = PRO_WORDS_PER_DAY * TOKEN_MULT;

export const FULL_CONFIG: FullConfig = {
  freeWordsPerDay: FREE_WORDS_PER_DAY,
  freeWordsPerMonth: FREE_WORDS_PER_DAY * MONTH_MULT,
  freeTokensPerDay: FREE_TOKENS_PER_DAY,
  freeTokensPerMonth: FREE_TOKENS_PER_DAY * MONTH_MULT,
  proWordsPerDay: PRO_WORDS_PER_DAY,
  proWordsPerMonth: PRO_WORDS_PER_DAY * MONTH_MULT,
  proTokensPerDay: PRO_TOKENS_PER_DAY,
  proTokensPerMonth: PRO_TOKENS_PER_DAY * MONTH_MULT,
};
