import type { RefObject } from "react";
import type { AppTarget } from "@repo/types";
import type { TextFieldInfo } from "./accessibility.types";
import type { StopRecordingResponse } from "./transcription-session.types";

export type HandleTranscriptParams = {
  rawTranscript: string;
  toneId: string | null;
  a11yInfo: TextFieldInfo | null;
  currentApp: AppTarget | null;
  loadingToken: symbol | null;
  audio: StopRecordingResponse;
};

export type HandleTranscriptResult = {
  shouldContinue: boolean;
};

export type StrategyContext = {
  overlayLoadingTokenRef: RefObject<symbol | null>;
};
