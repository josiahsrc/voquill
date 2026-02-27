import { z } from "zod";
import { STYLING_MODES } from "./common.types";

export const ENTERPRISE_STYLING_MODES = [...STYLING_MODES, "any"] as const;
export type EnterpriseStylingMode = (typeof ENTERPRISE_STYLING_MODES)[number];
export const EnterpriseStylingModeZod = z.enum(
  ENTERPRISE_STYLING_MODES,
) as z.ZodType<EnterpriseStylingMode>;

export type EnterpriseConfig = {
  allowPostProcessing: boolean;
  allowChangePostProcessing: boolean;
  allowChangeTranscriptionMethod: boolean;
  allowChangeAgentMode: boolean;
  allowEmailSignIn: boolean;
  allowDevTools: boolean;
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
    allowPostProcessing: z.boolean(),
    allowChangePostProcessing: z.boolean(),
    allowChangeTranscriptionMethod: z.boolean(),
    allowChangeAgentMode: z.boolean(),
    allowEmailSignIn: z.boolean(),
    allowDevTools: z.boolean(),
    stylingMode: EnterpriseStylingModeZod,
  })
  .strict() satisfies z.ZodType<EnterpriseConfig>;

export type OidcProvider = {
  id: string;
  name: string;
  issuerUrl: string;
  clientId: string;
  isEnabled: boolean;
  createdAt: string;
};

export type OidcProviderInput = {
  id?: string;
  name: string;
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  isEnabled: boolean;
};

export const OidcProviderInputZod = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    issuerUrl: z.string().url(),
    clientId: z.string().min(1),
    clientSecret: z.string().optional(),
    isEnabled: z.boolean(),
  })
  .strict() satisfies z.ZodType<OidcProviderInput>;
