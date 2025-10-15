export type FullConfig = {
	freeWordsPerDay: number;
	freeWordsPerMonth: number;
	proWordsPerDay: number;
	proWordsPerMonth: number;
};

export type PartialConfig = Partial<FullConfig>;
