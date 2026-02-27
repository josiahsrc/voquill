import {
  EnterpriseConfigZod,
  FullConfig,
  LlmProviderInputZod,
  Member,
  METRICS_RANGES,
  OidcProviderInputZod,
  SttProviderInputZod,
  Term,
  TermZod,
  Tone,
  ToneZod,
  UserZod,
  type Auth,
  type EmptyObject,
  type EnterpriseConfig,
  type EnterpriseLicense,
  type FlaggedAudio,
  type JsonResponse,
  type LlmProvider,
  type LlmProviderInput,
  type MetricsDaily,
  type MetricsPerProvider,
  type MetricsPerUser,
  type MetricsRange,
  type MetricsSummary,
  type Nullable,
  type OidcProvider,
  type OidcProviderInput,
  type SttProvider,
  type SttProviderInput,
  type User,
  type UserWithAuth,
} from "@repo/types";
import { z } from "zod";

export const CLOUD_MODELS = ["low", "medium", "large"] as const;
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
  "auth/createApiToken": {
    input: EmptyObject;
    output: {
      apiToken: string;
      apiRefreshToken: string;
    };
  };
  "auth/refreshApiToken": {
    input: {
      apiRefreshToken: string;
    };
    output: {
      apiToken: string;
    };
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

  // flagged audio
  "flaggedAudio/upsert": {
    input: {
      flaggedAudio: FlaggedAudio;
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
  "user/incrementWordCount": {
    input: {
      wordCount: number;
      timezone?: Nullable<string>;
    };
    output: EmptyObject;
  };
  "user/trackStreak": {
    input: {
      timezone?: Nullable<string>;
    };
    output: EmptyObject;
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

  // oidc providers
  "oidcProvider/list": {
    input: EmptyObject;
    output: {
      providers: OidcProvider[];
    };
  };
  "oidcProvider/upsert": {
    input: {
      provider: OidcProviderInput;
    };
    output: EmptyObject;
  };
  "oidcProvider/delete": {
    input: {
      providerId: string;
    };
    output: EmptyObject;
  };
  "oidcProvider/listEnabled": {
    input: EmptyObject;
    output: {
      providers: OidcProvider[];
    };
  };

  // config
  "config/getFullConfig": {
    input: EmptyObject;
    output: {
      config: FullConfig;
    };
  };

  // metrics
  "metrics/getSummary": {
    input: { range: MetricsRange };
    output: {
      summary: MetricsSummary;
      daily: MetricsDaily[];
      perUser: MetricsPerUser[];
      perProvider: MetricsPerProvider[];
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
    prompt: z.string().nullable().optional(),
    audioBase64: z.string().min(1),
    audioMimeType: z.string().min(1),
    simulate: z.boolean().nullable().optional(),
    language: z.string().min(1).optional(),
  })
  .strict() satisfies z.ZodType<HandlerInput<"ai/transcribeAudio">>;

export const AiGenerateTextInputZod = z
  .object({
    system: z.string().nullable().optional(),
    prompt: z.string(),
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

export const IncrementWordCountInputZod = z
  .object({
    wordCount: z.number().int(),
    timezone: z.string().min(1).nullable().optional(),
  })
  .strict() satisfies z.ZodType<HandlerInput<"user/incrementWordCount">>;

export const TrackStreakInputZod = z
  .object({
    timezone: z.string().min(1).nullable().optional(),
  })
  .strict() satisfies z.ZodType<HandlerInput<"user/trackStreak">>;

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

export const UpsertOidcProviderInputZod = z
  .object({
    provider: OidcProviderInputZod,
  })
  .strict() satisfies z.ZodType<HandlerInput<"oidcProvider/upsert">>;

export const DeleteOidcProviderInputZod = z
  .object({
    providerId: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"oidcProvider/delete">>;

export const RefreshApiTokenInputZod = z
  .object({
    apiRefreshToken: z.string().min(1),
  })
  .strict() satisfies z.ZodType<HandlerInput<"auth/refreshApiToken">>;

export const FlaggedAudioZod = z
  .object({
    id: z.string().min(1),
    filePath: z.string().min(1),
    feedback: z.string().min(1),
    transcriptionPrompt: z.string().nullable(),
    postProcessingPrompt: z.string().nullable(),
    rawTranscription: z.string().min(1),
    postProcessedTranscription: z.string().nullable(),
    transcriptionProvider: z.string().min(1),
    postProcessingProvider: z.string().nullable(),
  })
  .strict() satisfies z.ZodType<FlaggedAudio>;

export const UpsertFlaggedAudioInputZod = z
  .object({
    flaggedAudio: FlaggedAudioZod,
  })
  .strict() satisfies z.ZodType<HandlerInput<"flaggedAudio/upsert">>;

export const MetricsRangeZod = z.enum(METRICS_RANGES);

export const GetMetricsSummaryInputZod = z
  .object({
    range: MetricsRangeZod,
  })
  .strict() satisfies z.ZodType<HandlerInput<"metrics/getSummary">>;
