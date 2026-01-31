import z from "zod";
import type { PullStatus } from "./common.types";

export type SttProvider = {
  id: string;
  provider: string;
  name: string;
  url: string;
  apiKeySuffix: string;
  model: string;
  isEnabled: boolean;
  pullStatus: PullStatus;
  pullError: string | null;
  createdAt: string;
};

export type SttProviderInput = {
  id?: string;
  provider: string;
  name: string;
  url: string;
  apiKey?: string;
  model: string;
  isEnabled: boolean;
};

export const SttProviderInputZod = z
  .object({
    id: z.string().optional(),
    provider: z.string(),
    name: z.string(),
    url: z.string(),
    apiKey: z.string().default(""),
    model: z.string(),
    isEnabled: z.boolean(),
  })
  .strict() satisfies z.ZodType<SttProviderInput>;
