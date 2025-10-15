import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { FullConfig, MemberPlan, Nullable, PartialConfig } from "@repo/types";

export const getFullConfig = (config?: Nullable<PartialConfig>): FullConfig => {
	return {
		freeWordsPerDay: config?.freeWordsPerDay ?? 600,
		freeWordsPerMonth: config?.freeWordsPerMonth ?? 50_000,
		proWordsPerDay: config?.proWordsPerDay ?? 20_000,
		proWordsPerMonth: config?.proWordsPerMonth ?? 1_000_000,
	};
};

export const loadFullConfig = async (): Promise<FullConfig> => {
	const partialConfig = await firemix().get(mixpath.systemConfig());
	return getFullConfig(partialConfig?.data);
};

export type WordLimit = {
	perDay: number;
	perMonth: number;
};

export const getWordLimit = (
	config: FullConfig,
	plan: MemberPlan,
): WordLimit => {
	if (plan === "pro") {
		return {
			perDay: config.proWordsPerDay,
			perMonth: config.proWordsPerMonth,
		};
	} else {
		return {
			perDay: config.freeWordsPerDay,
			perMonth: config.freeWordsPerMonth,
		};
	}
};
