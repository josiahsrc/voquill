import type { EmptyObject, Nullable } from "@repo/types";

/** Handler definitions are app-check enforced */
type HandlerDefinitions = {
	// emulator
	"emulator/resetWordsToday": {
		input: EmptyObject;
		output: EmptyObject;
	};
	"emulator/resetWordsThisMonth": {
		input: EmptyObject;
		output: EmptyObject;
	};
	"emulator/processDelayedActions": {
		input: EmptyObject;
		output: EmptyObject;
	};

	// auth
	"auth/createCustomToken": {
		input: EmptyObject;
		output: {
			customToken: string;
		};
	};
	"auth/deleteMyAccount": {
		input: EmptyObject;
		output: EmptyObject;
	};
	"auth/cancelAccountDeletion": {
		input: EmptyObject;
		output: EmptyObject;
	};

	// member
	"member/tryInitialize": {
		input: EmptyObject;
		output: EmptyObject;
	};

	// voice
	"voice/transcribe": {
		input: {
			audioBase64: string;
			audioMimeType: string;
			simulate?: Nullable<boolean>;
		};
		output: {
			text: string;
		};
	};
	"voice/compose": {
		input: {
			audioBase64: string;
			audioMimeType: string;
			pageScreenshotBase64?: Nullable<string>;
			inputFieldContext?: Nullable<string>;
			currentInputTextValue?: Nullable<string>;
			currentInputTextSelection?: Nullable<string>;
			simulate?: Nullable<boolean>;
		};
		output: {
			text: string;
		};
	};
	"voice/transcribeDemo": {
		input: {
			audioBase64: string;
			audioMimeType: string;
			clientId: string;
			simulate?: Nullable<boolean>;
		};
		output: {
			text: string;
		};
	};
	"voice/composeDemo": {
		input: {
			audioBase64: string;
			audioMimeType: string;
			clientId: string;
			currentInputTextValue?: Nullable<string>;
			currentInputTextSelection?: Nullable<string>;
			simulate?: Nullable<boolean>;
		};
		output: {
			text: string;
		};
	};
	"voice/demoAvailable": {
		input: {
			clientId: string;
		};
		output: {
			available: boolean;
		};
	};

	// stripe
	"stripe/createCheckoutSession": {
		input: {
			priceId: string;
		};
		output: {
			sessionId: string;
			clientSecret: string;
		};
	};
	"stripe/getPrices": {
		input: {
			priceIds: string[];
		};
		output: {
			prices: Record<
				string,
				{
					unitAmount: Nullable<number>;
					unitAmountDecimal: Nullable<string>;
					currency: string;
				}
			>;
		};
	};
	"stripe/createCustomerPortalSession": {
		input: EmptyObject;
		output: {
			url: string;
		};
	};
};

export type HandlerName = keyof HandlerDefinitions;
export type HandlerInput<N extends HandlerName> =
	HandlerDefinitions[N]["input"];
export type HandlerOutput<N extends HandlerName> =
	HandlerDefinitions[N]["output"];

export const HANDLER_NAMES: string[] = Object.keys(
	{} as HandlerDefinitions
) as Array<HandlerName>;
