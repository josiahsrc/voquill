export type FullConfig = {
	freeWordsPerDay: number;
	freeWordsPerMonth: number;
	proWordsPerDay: number;
	proWordsPerMonth: number;
  freeTokensPerDay: number;
  freeTokensPerMonth: number;
  proTokensPerDay: number;
  proTokensPerMonth: number;
};

export type PartialConfig = Partial<FullConfig>;
