import type { RefObject } from "react";
import type { AppTarget } from "@repo/types";
import type { AccessibilityInfo } from "../types/accessibility.types";
import type { StopRecordingResponse } from "../types/transcription-session.types";

export type HandleTranscriptParams = {
  rawTranscript: string;
  toneId: string | null;
  a11yInfo: AccessibilityInfo | null;
  currentApp: AppTarget | null;
  loadingToken: symbol | null;
  audio: StopRecordingResponse;
};

export type HandleTranscriptResult = {
  shouldContinue: boolean;
};

export type RecordingContext = {
  overlayLoadingTokenRef: RefObject<symbol | null>;
};
