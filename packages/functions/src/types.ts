import {
  FullConfig,
  Member,
  Term,
  TermZod,
  UserZod,
  type EmptyObject,
  type JsonResponse,
  type Nullable,
  type User,
} from "@repo/types";
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
  "emulator/clearRateLimits": {
    input: EmptyObject;
    output: EmptyObject;
  };

  // term
  "term/listMyTerms": {
    input: EmptyObject;
    output: {
      terms: Term[];
    };
  };
  "term/upsertMyTerm": {
    input: {
      term: Term;
    };
    output: EmptyObject;
  };
  "term/deleteMyTerm": {
    input: {
      termId: string;
    };
    output: EmptyObject;
  };

  // member
  "member/tryInitialize": {
    input: EmptyObject;
    output: EmptyObject;
  };
  "member/getMyMember": {
    input: EmptyObject;
    output: {
      member: Nullable<Member>;
    };
  };

  // ai
  "ai/transcribeAudio": {
    input: {
      prompt?: Nullable<string>;
      audioBase64: string;
      audioMimeType: string;
      simulate?: Nullable<boolean>;
      language?: string;
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
      jsonResponse?: Nullable<JsonResponse>;
    };
    output: {
      text: string;
    };
  };

  // user
  "user/setMyUser": {
    input: {
      value: Partial<User>;
    };
    output: EmptyObject;
  };
  "user/getMyUser": {
    input: EmptyObject;
    output: {
      user: Nullable<User>;
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

  // config
  "config/getFullConfig": {
    input: EmptyObject;
    output: {
      config: FullConfig;
    };
  };
};

export type HandlerName = keyof HandlerDefinitions;
export type HandlerInput<N extends HandlerName> =
  HandlerDefinitions[N]["input"];
export type HandlerOutput<N extends HandlerName> =
  HandlerDefinitions[N]["output"];

export const HANDLER_NAMES: string[] = Object.keys(
  {} as HandlerDefinitions,
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
    prompt: z.string().max(20_000).nullable().optional(),
    audioBase64: z.string().min(1),
    audioMimeType: z.string().min(1),
    simulate: z.boolean().nullable().optional(),
    language: z.string().min(1).optional(),
  })
  .strict() satisfies z.ZodType<HandlerInput<"ai/transcribeAudio">>;

export const AiGenerateTextInputZod = z
  .object({
    system: z.string().max(3_000).nullable().optional(),
    prompt: z.string().max(25_000),
    simulate: z.boolean().nullable().optional(),
    jsonResponse: JsonResponseZod.nullable().optional(),
  })
  .strict() satisfies z.ZodType<HandlerInput<"ai/generateText">>;

export const StripeCreateCheckoutSessionInputZod = z
  .object({
    priceId: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"stripe/createCheckoutSession">>;

export const StripeGetPricesInputZod = z
  .object({
    priceIds: z.array(z.string().min(1)),
  })
  .strict() satisfies z.ZodType<HandlerInput<"stripe/getPrices">>;

export const SetMyUserInputZod = z
  .object({
    value: UserZod,
  })
  .strict() satisfies z.ZodType<HandlerInput<"user/setMyUser">>;

export const UpsertTermInputZod = z
  .object({
    term: TermZod,
  })
  .strict() satisfies z.ZodType<HandlerInput<"term/upsertMyTerm">>;

export const DeleteTermInputZod = z
  .object({
    termId: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"term/deleteMyTerm">>;
