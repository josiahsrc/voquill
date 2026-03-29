import type { HandlerOutput } from "@voquill/functions";

// These limits aren't necessary for enterprise, but are kept here to implement the schema for enterprise.
const WORD_LIMIT = 5_000_000;
const TOKEN_LIMIT = WORD_LIMIT * 250;

export async function getFullConfig(): Promise<
  HandlerOutput<"config/getFullConfig">
> {
  return {
    config: {
      freeWordsPerDay: WORD_LIMIT,
      freeWordsPerWeek: WORD_LIMIT * 7,
      freeWordsPerMonth: WORD_LIMIT * 30,
      freeTokensPerDay: TOKEN_LIMIT,
      freeTokensPerWeek: TOKEN_LIMIT * 7,
      freeTokensPerMonth: TOKEN_LIMIT * 30,
      proWordsPerDay: WORD_LIMIT,
      proWordsPerWeek: WORD_LIMIT * 7,
      proWordsPerMonth: WORD_LIMIT * 30,
      proTokensPerDay: TOKEN_LIMIT,
      proTokensPerWeek: TOKEN_LIMIT * 7,
      proTokensPerMonth: TOKEN_LIMIT * 30,
    },
  };
}
