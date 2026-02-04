import {
  EnterpriseConfigZod,
  FullConfig,
  Member,
  type EnterpriseLicense,
  LlmProviderInputZod,
  SttProviderInputZod,
  Term,
  TermZod,
  Tone,
  ToneZod,
  UserZod,
  type Auth,
  type EmptyObject,
  type EnterpriseConfig,
  type JsonResponse,
  type LlmProvider,
  type LlmProviderInput,
  type Nullable,
  type SttProvider,
  type SttProviderInput,
  type User,
  type UserWithAuth,
} from "@repo/types";
import { z } from "zod";

export const CLOUD_MODELS = ["medium", "large"] as const;
export type CloudModel = (typeof CLOUD_MODELS)[number];
export const CloudModelZod = z.enum(CLOUD_MODELS);

type HandlerDefinitions = {
  // auth (enterprise only)
  "auth/register": {
    input: {
      email: string;
      password: string;
    };
    output: {
      token: string;
      refreshToken: string;
      auth: Auth;
    };
  };
  "auth/login": {
    input: {
      email: string;
      password: string;
    };
    output: {
      token: string;
      refreshToken: string;
      auth: Auth;
    };
  };
  "auth/logout": {
    input: EmptyObject;
    output: EmptyObject;
  };
  "auth/refresh": {
    input: {
      refreshToken: string;
    };
    output: {
      token: string;
      refreshToken: string;
      auth: Auth;
    };
  };
  "auth/makeAdmin": {
    input: {
      userId: string;
      isAdmin: boolean;
    };
    output: EmptyObject;
  };
  "auth/deleteUser": {
    input: {
      userId: string;
    };
    output: EmptyObject;
  };
  "auth/resetPassword": {
    input: {
      userId: string;
      password: string;
    };
    output: EmptyObject;
  };

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
  "emulator/cancelProTrials": {
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
  "term/listGlobalTerms": {
    input: EmptyObject;
    output: {
      terms: Term[];
    };
  };
  "term/upsertGlobalTerm": {
    input: {
      term: Term;
    };
    output: EmptyObject;
  };
  "term/deleteGlobalTerm": {
    input: {
      termId: string;
    };
    output: EmptyObject;
  };

  // tone
  "tone/listMyTones": {
    input: EmptyObject;
    output: {
      tones: Tone[];
    };
  };
  "tone/upsertMyTone": {
    input: {
      tone: Tone;
    };
    output: EmptyObject;
  };
  "tone/deleteMyTone": {
    input: {
      toneId: string;
    };
    output: EmptyObject;
  };
  "tone/listGlobalTones": {
    input: EmptyObject;
    output: {
      tones: Tone[];
    };
  };
  "tone/upsertGlobalTone": {
    input: {
      tone: Tone;
    };
    output: EmptyObject;
  };
  "tone/deleteGlobalTone": {
    input: {
      toneId: string;
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
      model?: Nullable<CloudModel>;
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

  "user/listAllUsers": {
    input: EmptyObject;
    output: {
      users: UserWithAuth[];
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

  // stt providers
  "sttProvider/list": {
    input: EmptyObject;
    output: {
      providers: SttProvider[];
    };
  };
  "sttProvider/upsert": {
    input: {
      provider: SttProviderInput;
    };
    output: EmptyObject;
  };
  "sttProvider/delete": {
    input: {
      providerId: string;
    };
    output: EmptyObject;
  };
  "sttProvider/pull": {
    input: {
      providerId: string;
    };
    output: {
      provider: Nullable<SttProvider>;
    };
  };

  // llm providers
  "llmProvider/list": {
    input: EmptyObject;
    output: {
      providers: LlmProvider[];
    };
  };
  "llmProvider/upsert": {
    input: {
      provider: LlmProviderInput;
    };
    output: EmptyObject;
  };
  "llmProvider/delete": {
    input: {
      providerId: string;
    };
    output: EmptyObject;
  };
  "llmProvider/pull": {
    input: {
      providerId: string;
    };
    output: {
      provider: Nullable<LlmProvider>;
    };
  };

  // system
  "system/getVersion": {
    input: EmptyObject;
    output: {
      version: string;
    };
  };

  // enterprise config
  "enterprise/getConfig": {
    input: EmptyObject;
    output: {
      config: EnterpriseConfig;
      license: EnterpriseLicense;
    };
  };
  "enterprise/upsertConfig": {
    input: {
      config: EnterpriseConfig;
    };
    output: EmptyObject;
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
    model: CloudModelZod.nullable().optional(),
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

export const UpsertToneInputZod = z
  .object({
    tone: ToneZod,
  })
  .strict() satisfies z.ZodType<HandlerInput<"tone/upsertMyTone">>;

export const DeleteToneInputZod = z
  .object({
    toneId: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"tone/deleteMyTone">>;

export const AuthRegisterInputZod = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
  })
  .strict() satisfies z.ZodType<HandlerInput<"auth/register">>;

export const AuthMakeAdminInputZod = z
  .object({
    userId: z.string().min(1),
    isAdmin: z.boolean(),
  })
  .strict() satisfies z.ZodType<HandlerInput<"auth/makeAdmin">>;

export const AuthLoginInputZod = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"auth/login">>;

export const AuthResetPasswordInputZod = z
  .object({
    userId: z.string().min(1),
    password: z.string().min(8),
  })
  .strict() satisfies z.ZodType<HandlerInput<"auth/resetPassword">>;

export const AuthDeleteUserInputZod = z
  .object({
    userId: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"auth/deleteUser">>;

export const AuthRefreshInputZod = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"auth/refresh">>;

export const UpsertSttProviderInputZod = z
  .object({
    provider: SttProviderInputZod,
  })
  .strict() satisfies z.ZodType<HandlerInput<"sttProvider/upsert">>;

export const DeleteSttProviderInputZod = z
  .object({
    providerId: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"sttProvider/delete">>;

export const PullSttProviderInputZod = z
  .object({
    providerId: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"sttProvider/pull">>;

export const UpsertLlmProviderInputZod = z
  .object({
    provider: LlmProviderInputZod,
  })
  .strict() satisfies z.ZodType<HandlerInput<"llmProvider/upsert">>;

export const DeleteLlmProviderInputZod = z
  .object({
    providerId: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"llmProvider/delete">>;

export const PullLlmProviderInputZod = z
  .object({
    providerId: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"llmProvider/pull">>;

export const UpsertEnterpriseConfigInputZod = z
  .object({
    config: EnterpriseConfigZod,
  })
  .strict() satisfies z.ZodType<HandlerInput<"enterprise/upsertConfig">>;
