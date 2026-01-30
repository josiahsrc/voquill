import { z } from "zod";

export type EnterpriseConfig = {
  allowChangePostProcessing: boolean;
  allowChangeTranscriptionMethod: boolean;
};

export const EnterpriseConfigZod = z
  .object({
    allowChangePostProcessing: z.boolean(),
    allowChangeTranscriptionMethod: z.boolean(),
  })
  .strict() satisfies z.ZodType<EnterpriseConfig>;
