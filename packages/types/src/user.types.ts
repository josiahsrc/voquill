import { BlazeTimestamp } from "../blaze";
import type { Nullable } from "./common.types";

export type User = {
	id: string;
	createdAt: BlazeTimestamp;
	updatedAt: BlazeTimestamp;
	name: string;
	bio?: Nullable<string>;
	onboarded: boolean;
	onboardedAt: Nullable<BlazeTimestamp>;
	timezone?: Nullable<string>;
};
