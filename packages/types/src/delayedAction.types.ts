import type { BlazeTimestamp } from "../blaze";
import type { Nullable } from "./common.types";

type BaseDelayedAction<T extends string> = {
	id: string;
	type: T;
	createdAt: BlazeTimestamp;
	createdByUserId?: Nullable<string>;
	runAfterTimestamp: BlazeTimestamp;
	status: "pending" | "completed" | "failed";
	processedAt?: Nullable<BlazeTimestamp>;
	errorMessage?: Nullable<string>;
};

export type DeleteAccountAction = BaseDelayedAction<"deleteAccount"> & {
	userId: string;
};

export type DelayedAction = DeleteAccountAction;
