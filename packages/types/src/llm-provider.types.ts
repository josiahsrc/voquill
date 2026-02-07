import type { PullStatus } from "./common.types";
import z from "zod";

export type LlmProvider = {
  id: string;
  provider: string;
  name: string;
  url: string;
  apiKeySuffix: string;
  model: string;
  tier: number;
  pullStatus: PullStatus;
  pullError: string | null;
  createdAt: string;
};

export type LlmProviderInput = {
  id?: string;
  provider: string;
  name: string;
  url: string;
  apiKey?: string;
  model: string;
  tier: number;
};

export const LlmProviderInputZod = z
  .object({
    id: z.string().optional(),
    provider: z.string(),
    name: z.string(),
    url: z.string(),
    apiKey: z.string().default(""),
    model: z.string(),
    tier: z.number().int(),
  })
  .strict() satisfies z.ZodType<LlmProviderInput>;
