import { z } from "zod";
import { STYLING_MODES } from "./common.types";

export const ENTERPRISE_STYLING_MODES = [...STYLING_MODES, "any"] as const;
export type EnterpriseStylingMode = (typeof ENTERPRISE_STYLING_MODES)[number];
export const EnterpriseStylingModeZod = z.enum(
  ENTERPRISE_STYLING_MODES,
) as z.ZodType<EnterpriseStylingMode>;

export type EnterpriseConfig = {
  allowChangePostProcessing: boolean;
  allowChangeTranscriptionMethod: boolean;
  allowChangeAgentMode: boolean;
  stylingMode: EnterpriseStylingMode;
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
    stylingMode: EnterpriseStylingModeZod,
  })
  .strict() satisfies z.ZodType<EnterpriseConfig>;
