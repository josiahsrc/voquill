import { z } from "zod";

export type EnterpriseConfig = {
  allowChangePostProcessing: boolean;
  allowChangeTranscriptionMethod: boolean;
  allowChangeAgentMode: boolean;
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
    allowChangeAgentMode: z.boolean(),
  })
  .strict() satisfies z.ZodType<EnterpriseConfig>;
