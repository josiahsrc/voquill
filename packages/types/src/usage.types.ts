import { BlazeTimestamp } from "../blaze";

export type UsageItem = {
	seconds: number;
	words: number;
};

export type Usage = {
	id: string;
	// Map of iso date strings to UsageItem
	usage: Record<string, UsageItem>;
	createdAt: BlazeTimestamp;
	updatedAt: BlazeTimestamp;
};
