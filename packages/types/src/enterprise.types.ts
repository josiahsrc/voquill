import { z } from "zod";

export type EnterpriseConfig = {
  allowChangePostProcessing: boolean;
  allowChangeTranscriptionMethod: boolean;
};

export type EnterpriseLicense = {
  org: string;
  maxSeats: number;
  issued: string;
  expires: string;
};

export const EnterpriseConfigZod = z
  .object({
    allowChangePostProcessing: z.boolean(),
    allowChangeTranscriptionMethod: z.boolean(),
  })
  .strict() satisfies z.ZodType<EnterpriseConfig>;
