import type { HandlerOutput } from "@repo/functions";

// These limits aren't necessary for enterprise, but are kept here to implement the schema for enterprise.
const WORD_LIMIT = 5_000_000;
const TOKEN_LIMIT = WORD_LIMIT * 250;

export async function getFullConfig(): Promise<
  HandlerOutput<"config/getFullConfig">
> {
  return {
    config: {
      freeWordsPerDay: WORD_LIMIT,
      freeWordsPerMonth: WORD_LIMIT * 30,
      freeTokensPerDay: TOKEN_LIMIT,
      freeTokensPerMonth: TOKEN_LIMIT * 30,
      proWordsPerDay: WORD_LIMIT,
      proWordsPerMonth: WORD_LIMIT * 30,
      proTokensPerDay: TOKEN_LIMIT,
      proTokensPerMonth: TOKEN_LIMIT * 30,
    },
  };
}
