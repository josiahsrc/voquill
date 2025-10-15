import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { CallableRequest, onCall } from "firebase-functions/v2/https";
import {
  cancelAccountDeletion,
  createCustomToken,
  enqueueAccountDeletion,
} from "./services/auth.service";
import { processDelayedActions } from "./services/delayedAction.service";
import {
  handleResetWordsThisMonth,
  handleResetWordsToday,
  handleTryInitializeMember,
} from "./services/member.service";
import {
  createCheckoutSession,
  createCustomerPortalSession,
  handleGetPrices,
} from "./services/stripe.service";
import {
  compose,
  composeDemo,
  demoAvailable,
  transcribe,
  transcribeDemo,
} from "./services/voice.service";
import { HandlerInput, HandlerName } from "@repo/functions";
import { getClientIp } from "./utils/demo.util";
import {
  getStorageBucket,
  GROQ_API_KEY_VAR,
  HASH_SECRET_VAR,
  isEmulated,
  LOOPS_API_KEY_VAR,
  STRIPE_SECRET_KEY_VAR,
} from "./utils/env.utils";
import { NotFoundError, wrapAsync } from "./utils/error.utils";

// Emulators default to appspot.com for the storage bucket. If we
// try to change that, we get cors errors on the frontend.
if (getStorageBucket()) {
  initializeApp({ storageBucket: getStorageBucket() });
} else {
  initializeApp();
}

getFirestore().settings({ ignoreUndefinedProperties: true });

export * as auth from "./functions/auth.functions";
export * as delayedAction from "./functions/delayedAction.functions";
export * as member from "./functions/member.functions";
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
      HASH_SECRET_VAR,
      STRIPE_SECRET_KEY_VAR,
      GROQ_API_KEY_VAR,
      LOOPS_API_KEY_VAR,
    ],
    memory: "1GiB",
  },
  async (req: CallableRequest<HandlerRequest>) => {
    return await wrapAsync(async () => {
      const { name, args } = req.data;
      const auth = req.auth ?? null;

      if (name.startsWith("emulator/") && !isEmulated()) {
        throw new NotFoundError(`unknown handler: ${name}`);
      }

      console.log("handler called", name);
      let data: unknown;
      if (name === "stripe/createCheckoutSession") {
        data = await createCheckoutSession({
          auth,
          origin: req.rawRequest.get("origin") ?? "",
          input: args as HandlerInput<"stripe/createCheckoutSession">,
        });
      } else if (name === "member/tryInitialize") {
        data = await handleTryInitializeMember({
          auth,
          input: args as HandlerInput<"member/tryInitialize">,
        });
      } else if (name === "stripe/getPrices") {
        data = await handleGetPrices({
          input: args as HandlerInput<"stripe/getPrices">,
        });
      } else if (name === "stripe/createCustomerPortalSession") {
        data = await createCustomerPortalSession({
          auth,
          origin: req.rawRequest.get("origin") ?? "",
        });
      } else if (name === "auth/createCustomToken") {
        data = await createCustomToken({
          auth,
          input: args as HandlerInput<"auth/createCustomToken">,
        });
      } else if (name === "auth/deleteMyAccount") {
        data = await enqueueAccountDeletion({
          auth,
        });
      } else if (name === "auth/cancelAccountDeletion") {
        data = await cancelAccountDeletion({
          auth,
        });
      } else if (name === "voice/transcribe") {
        data = await transcribe({
          auth,
          input: args as HandlerInput<"voice/transcribe">,
        });
      } else if (name === "voice/transcribeDemo") {
        data = await transcribeDemo({
          ip: getClientIp(req),
          input: args as HandlerInput<"voice/transcribeDemo">,
        });
      } else if (name === "voice/demoAvailable") {
        data = await demoAvailable({
          input: args as HandlerInput<"voice/demoAvailable">,
          ip: getClientIp(req),
        });
      } else if (name === "voice/compose") {
        data = await compose({
          auth,
          input: args as HandlerInput<"voice/compose">,
        });
      } else if (name === "voice/composeDemo") {
        data = await composeDemo({
          ip: getClientIp(req),
          input: args as HandlerInput<"voice/composeDemo">,
        });
      } else if (name === "emulator/resetWordsToday") {
        data = await handleResetWordsToday();
      } else if (name === "emulator/resetWordsThisMonth") {
        data = await handleResetWordsThisMonth();
      } else if (name === "emulator/processDelayedActions") {
        data = await processDelayedActions();
      } else {
        throw new NotFoundError(`unknown handler: ${name}`);
      }

      return data;
    });
  }
);
