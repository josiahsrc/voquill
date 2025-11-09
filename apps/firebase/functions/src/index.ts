import * as admin from "firebase-admin";
import {
  AiGenerateTextInputZod,
  AiTranscribeAudioInputZod,
  EmptyObjectZod,
  HandlerName,
  SetMyUserInputZod,
  StripeCreateCheckoutSessionInputZod,
  StripeGetPricesInputZod,
} from "@repo/functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { CallableRequest, onCall } from "firebase-functions/v2/https";
import { runGenerateText, runTranscribeAudio } from "./services/ai.service";
import {
  cancelAccountDeletion,
  enqueueAccountDeletion,
} from "./services/auth.service";
import { processDelayedActions } from "./services/delayedAction.service";
import {
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
import { getMyUser, setMyUser } from "./services/user.service";
import {
  getDatabaseUrl,
  getStorageBucket,
  GROQ_API_KEY_VAR,
  isEmulated,
  LOOPS_API_KEY_VAR,
  STRIPE_SECRET_KEY_VAR
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
export * as delayedAction from "./functions/delayedAction.functions";
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
    secrets: [
      STRIPE_SECRET_KEY_VAR,
      GROQ_API_KEY_VAR,
      LOOPS_API_KEY_VAR,
    ],
    memory: "1GiB",
    maxInstances: 16,
  },
  async (req: CallableRequest<HandlerRequest>) => {
    return await wrapAsync(async () => {
      const { name, args } = req.data;

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
      console.log("handler called", name);
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
      } else if (name === "auth/deleteMyAccount") {
        validateData(EmptyObjectZod, args ?? {});
        data = await enqueueAccountDeletion({
          auth,
        });
      } else if (name === "auth/cancelAccountDeletion") {
        validateData(EmptyObjectZod, args ?? {});
        data = await cancelAccountDeletion({
          auth,
        });
      } else if (name === "emulator/resetWordsToday") {
        validateData(EmptyObjectZod, args ?? {});
        data = await handleResetLimitsToday();
      } else if (name === "emulator/resetWordsThisMonth") {
        validateData(EmptyObjectZod, args ?? {});
        data = await handleResetLimitsThisMonth();
      } else if (name === "emulator/processDelayedActions") {
        validateData(EmptyObjectZod, args ?? {});
        data = await processDelayedActions();
      } else if (name === "emulator/clearRateLimits") {
        validateData(EmptyObjectZod, args ?? {});
        data = await clearRateLimits();
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
      } else {
        throw new NotFoundError(`unknown handler: ${name}`);
      }

      return data;
    });
  }
);
