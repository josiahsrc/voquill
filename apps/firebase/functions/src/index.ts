import {
	AiGenerateTextInputZod,
	AiTranscribeAudioInputZod,
	DeleteTermInputZod,
	DeleteToneInputZod,
	EmptyObjectZod,
	HandlerName,
	RefreshApiTokenInputZod,
	SetMyUserInputZod,
	StripeCreateCheckoutSessionInputZod,
	StripeGetPricesInputZod,
	UpsertTermInputZod,
	UpsertToneInputZod,
} from "@repo/functions";
import * as admin from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { CallableRequest, onCall } from "firebase-functions/v2/https";
import { runGenerateText, runTranscribeAudio } from "./services/ai.service";
import {
	createApiToken,
	refreshApiToken,
} from "./services/apiToken.service";
import { getFullConfigResp } from "./services/config.service";
import {
	getMyMember,
	handleCancelProTrials,
	handleResetLimitsThisMonth,
	handleResetLimitsToday,
	handleTryInitializeMember,
} from "./services/member.service";
import { clearRateLimits } from "./services/rateLimit.service";
import {
	createCheckoutSession,
	createCustomerPortalSession,
	handleGetPrices,
} from "./services/stripe.service";
import {
	deleteMyTerm,
	listMyTerms,
	upsertMyTerm,
} from "./services/term.service";
import {
	deleteMyTone,
	listMyTones,
	upsertMyTone,
} from "./services/tone.service";
import { getMyUser, setMyUser } from "./services/user.service";
import {
	getDatabaseUrl,
	getFlavor,
	getStorageBucket,
	GROQ_API_KEY_VAR,
	isEmulated,
	LOOPS_API_KEY_VAR,
	STRIPE_SECRET_KEY_VAR,
} from "./utils/env.utils";
import { NotFoundError, wrapAsync } from "./utils/error.utils";
import { validateData } from "./utils/zod.utils";

// Emulators default to appspot.com for the storage bucket. If we
// try to change that, we get cors errors on the frontend.
initializeApp({
	storageBucket: getStorageBucket(),
	databaseURL: getDatabaseUrl(),
});

getFirestore().settings({ ignoreUndefinedProperties: true });

export * as auth from "./functions/auth.functions";
export * as member from "./functions/member.functions";
export * as rateLimit from "./functions/rateLimit.functions";
export * as stripe from "./functions/stripe.functions";
export * as user from "./functions/user.functions";

export type HandlerRequest = {
	name: HandlerName;
	args: unknown;
};

/**
 * Handles all requests from the frontend. Inputs are casted
 * to the correct type based on the handler name.
 *
 * ```ts
 * data = await register({
 *   auth,
 *   input: args as HandlerInput<"plaid/register">,
 * });
 * ```
 */
export const handler = onCall(
	{
		secrets: [STRIPE_SECRET_KEY_VAR, GROQ_API_KEY_VAR, LOOPS_API_KEY_VAR],
		memory: "1GiB",
		maxInstances: 16,
	},
	async (req: CallableRequest<HandlerRequest>) => {
		return await wrapAsync(async () => {
			const { name, args } = req.data;
			console.log("handler called", name);
			if (getFlavor() === "dev") {
				throw new Error("dev has not been implemented yet");
			}

			// deny disabled users
			const auth = req.auth ?? null;
			if (auth) {
				await admin.auth().verifyIdToken(auth.rawToken, true);
			}

			// omit emulator-only handlers when not emulated
			if (name.startsWith("emulator/") && !isEmulated()) {
				throw new NotFoundError(`unknown handler: ${name}`);
			}

			// handlers
			let data: unknown;
			if (name === "stripe/createCheckoutSession") {
				data = await createCheckoutSession({
					auth,
					origin: req.rawRequest.get("origin") ?? "",
					input: validateData(StripeCreateCheckoutSessionInputZod, args),
				});
			} else if (name === "member/tryInitialize") {
				data = await handleTryInitializeMember({
					auth,
					input: validateData(EmptyObjectZod, args ?? {}),
				});
			} else if (name === "stripe/getPrices") {
				data = await handleGetPrices({
					input: validateData(StripeGetPricesInputZod, args),
				});
			} else if (name === "stripe/createCustomerPortalSession") {
				validateData(EmptyObjectZod, args ?? {});
				data = await createCustomerPortalSession({
					auth,
					origin: req.rawRequest.get("origin") ?? "",
				});
			} else if (name === "emulator/resetWordsToday") {
				validateData(EmptyObjectZod, args ?? {});
				data = await handleResetLimitsToday();
			} else if (name === "emulator/resetWordsThisMonth") {
				validateData(EmptyObjectZod, args ?? {});
				data = await handleResetLimitsThisMonth();
			} else if (name === "emulator/clearRateLimits") {
				validateData(EmptyObjectZod, args ?? {});
				data = await clearRateLimits();
			} else if (name === "emulator/cancelProTrials") {
				validateData(EmptyObjectZod, args ?? {});
				data = await handleCancelProTrials();
			} else if (name === "ai/transcribeAudio") {
				data = await runTranscribeAudio({
					auth,
					input: validateData(AiTranscribeAudioInputZod, args),
				});
			} else if (name === "ai/generateText") {
				data = await runGenerateText({
					auth,
					input: validateData(AiGenerateTextInputZod, args),
				});
			} else if (name === "member/getMyMember") {
				validateData(EmptyObjectZod, args ?? {});
				data = await getMyMember({
					auth,
				});
			} else if (name === "user/setMyUser") {
				data = await setMyUser({
					auth,
					data: validateData(SetMyUserInputZod, args).value,
				});
			} else if (name === "user/getMyUser") {
				validateData(EmptyObjectZod, args ?? {});
				data = await getMyUser({
					auth,
				});
			} else if (name === "config/getFullConfig") {
				validateData(EmptyObjectZod, args ?? {});
				data = getFullConfigResp();
			} else if (name === "term/deleteMyTerm") {
				data = await deleteMyTerm({
					auth,
					input: validateData(DeleteTermInputZod, args),
				});
			} else if (name === "term/upsertMyTerm") {
				data = await upsertMyTerm({
					auth,
					input: validateData(UpsertTermInputZod, args),
				});
			} else if (name === "term/listMyTerms") {
				validateData(EmptyObjectZod, args ?? {});
				data = await listMyTerms({
					auth,
				});
			} else if (name === "tone/deleteMyTone") {
				data = await deleteMyTone({
					auth,
					input: validateData(DeleteToneInputZod, args),
				});
			} else if (name === "tone/upsertMyTone") {
				data = await upsertMyTone({
					auth,
					input: validateData(UpsertToneInputZod, args),
				});
			} else if (name === "tone/listMyTones") {
				validateData(EmptyObjectZod, args ?? {});
				data = await listMyTones({
					auth,
				});
			} else if (name === "auth/createApiToken") {
				validateData(EmptyObjectZod, args ?? {});
				data = await createApiToken({
					auth,
				});
			} else if (name === "auth/refreshApiToken") {
				data = await refreshApiToken({
					input: validateData(RefreshApiTokenInputZod, args),
				});
			} else {
				throw new NotFoundError(`unknown handler: ${name}`);
			}

			return data;
		});
	},
);
