export type FullConfig = {
  freeWordsPerDay: number;
  freeWordsPerWeek: number;
  freeWordsPerMonth: number;
  freeTokensPerDay: number;
  freeTokensPerWeek: number;
  freeTokensPerMonth: number;
  proWordsPerDay: number;
  proWordsPerWeek: number;
  proWordsPerMonth: number;
  proTokensPerDay: number;
  proTokensPerWeek: number;
  proTokensPerMonth: number;
  toneOverrides?: Record<string, string>;
};

const TOKEN_MULT = 18;
const FREE_WORDS_PER_WEEK = 2_000;
const FREE_TOKENS_PER_WEEK = FREE_WORDS_PER_WEEK * TOKEN_MULT;
const PRO_WORDS_PER_WEEK = 100_000;
const PRO_TOKENS_PER_WEEK = PRO_WORDS_PER_WEEK * TOKEN_MULT;

export const FULL_CONFIG: FullConfig = {
  freeWordsPerDay: FREE_WORDS_PER_WEEK,
  freeWordsPerWeek: FREE_WORDS_PER_WEEK,
  freeWordsPerMonth: FREE_WORDS_PER_WEEK * 5,
  freeTokensPerDay: FREE_TOKENS_PER_WEEK,
  freeTokensPerWeek: FREE_TOKENS_PER_WEEK,
  freeTokensPerMonth: FREE_TOKENS_PER_WEEK * 5,
  proWordsPerDay: PRO_WORDS_PER_WEEK,
  proWordsPerWeek: PRO_WORDS_PER_WEEK,
  proWordsPerMonth: PRO_WORDS_PER_WEEK * 5,
  proTokensPerDay: PRO_TOKENS_PER_WEEK,
  proTokensPerWeek: PRO_TOKENS_PER_WEEK,
  proTokensPerMonth: PRO_TOKENS_PER_WEEK * 5,
};
