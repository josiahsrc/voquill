import type { EmptyObject, JsonResponse, Nullable } from "@repo/types";
import { z } from "zod";

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

  // ai
  "ai/transcribeAudio": {
    input: {
      prompt?: Nullable<string>;
      audioBase64: string;
      audioMimeType: string;
      simulate?: Nullable<boolean>;
    };
    output: {
      text: string;
    };
  };
  "ai/generateText": {
    input: {
      system?: Nullable<string>;
      prompt: string;
      simulate?: Nullable<boolean>;
      jsonResponse?: JsonResponse;
    };
    output: {
      text: string;
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

export const EmptyObjectZod = z.object({}).strict();

export const JsonResponseZod = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    schema: z.record(z.unknown()),
  })
  .strict() satisfies z.ZodType<JsonResponse>;

export const AiTranscribeAudioInputZod = z
  .object({
    prompt: z.string().nullable().optional(),
    audioBase64: z.string().min(1),
    audioMimeType: z.string().min(1),
    simulate: z.boolean().nullable().optional(),
  })
  .strict() satisfies z.ZodType<HandlerInput<"ai/transcribeAudio">>;

export const AiGenerateTextInputZod = z
  .object({
    system: z.string().nullable().optional(),
    prompt: z.string().min(1),
    simulate: z.boolean().nullable().optional(),
    jsonResponse: JsonResponseZod.optional(),
  })
  .strict() satisfies z.ZodType<HandlerInput<"ai/generateText">>;

export const StripeCreateCheckoutSessionInputZod = z
  .object({
    priceId: z.string().min(1),
  })
  .strict() satisfies z.ZodType<
    HandlerInput<"stripe/createCheckoutSession">
  >;

export const StripeGetPricesInputZod = z
  .object({
    priceIds: z.array(z.string().min(1)),
  })
  .strict() satisfies z.ZodType<HandlerInput<"stripe/getPrices">>;
