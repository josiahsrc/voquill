import type { Nullable } from "./common.types";
import type { MemberPlan } from "./member.types";

export type Contact = {
	id: string;
	email?: Nullable<string>;
	plan?: Nullable<MemberPlan>;
	isPaying?: Nullable<boolean>;
	firstName?: Nullable<string>;
	lastName?: Nullable<string>;
	name?: Nullable<string>;
	userGroup?: Nullable<string>;
	createdAt?: Nullable<string>;
};
