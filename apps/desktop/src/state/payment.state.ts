import { Nullable } from "@repo/types";

export type PaymentState = {
	open: boolean;
	priceId: Nullable<string>;
};

export const INITIAL_PAYMENT_STATE: PaymentState = {
	open: false,
	priceId: null,
};
