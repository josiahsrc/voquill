import z from "zod";

export type SttProvider = {
  id: string;
  provider: string;
  name: string;
  url: string;
  apiKeySuffix: string;
  model: string;
  isEnabled: boolean;
  createdAt: string;
};

export type SttProviderInput = {
  id?: string;
  provider: string;
  name: string;
  url: string;
  apiKey: string;
  model: string;
  isEnabled: boolean;
};

export const SttProviderInputZod = z
  .object({
    id: z.string().optional(),
    provider: z.string().min(1),
    name: z.string().min(1),
    url: z.string().min(1),
    apiKey: z.string().min(1),
    model: z.string().min(1),
    isEnabled: z.boolean(),
  })
  .strict() satisfies z.ZodType<SttProviderInput>;
