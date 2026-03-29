import type { Nullable } from "@voquill/types";
import type { OverlayPhase } from "../types/overlay.types";
import type {
  HandleTranscriptParams,
  HandleTranscriptResult,
  StrategyValidationError,
} from "../types/strategy.types";

export abstract class BaseStrategy {
  constructor() {}

  abstract validateAvailability(): Nullable<StrategyValidationError>;
  abstract onBeforeStart(): Promise<void>;
  abstract setPhase(phase: OverlayPhase): Promise<void>;
  abstract handleTranscript(
    params: HandleTranscriptParams,
  ): Promise<HandleTranscriptResult>;
  abstract shouldStoreTranscript(): boolean;

  abstract cleanup(): Promise<void>;

  handleInterimSegment(_segment: string): void {}
}
