import type { RefObject } from "react";
import type { AppTarget } from "@repo/types";
import type { AccessibilityInfo } from "../types/accessibility.types";

export type PostProcessParams = {
  rawTranscript: string;
  toneId: string | null;
  a11yInfo: AccessibilityInfo | null;
};

export type PostProcessOutput = {
  transcript: string;
  metadata: object;
  warnings: string[];
};

export type CompleteParams = {
  transcript: string | null;
  currentApp: AppTarget | null;
  loadingToken: symbol | null;
};

export type CompleteResult = {
  shouldContinue: boolean;
};

export type RecordingContext = {
  overlayLoadingTokenRef: RefObject<symbol | null>;
};
