import { FiremixTimestamp } from "@firemix/core";
import type { Nullable } from "./common.types";

export type User = {
  id: string;
  createdAt: FiremixTimestamp;
  updatedAt: FiremixTimestamp;
  name: string;
  bio?: Nullable<string>;
  onboarded: boolean;
  onboardedAt: Nullable<FiremixTimestamp>;
  timezone?: Nullable<string>;
  preferredMicrophone?: Nullable<string>;
  playInteractionChime: boolean;
  preferredTranscriptionMode?: Nullable<"local" | "api">;
  preferredTranscriptionApiKeyId?: Nullable<string>;
  preferredPostProcessingMode?: Nullable<"none" | "api">;
  preferredPostProcessingApiKeyId?: Nullable<string>;
};
