import type { Nullable } from "@repo/types";
import type { OverlayPhase } from "../types/overlay.types";
import type {
  HandleTranscriptParams,
  HandleTranscriptResult,
  StrategyContext,
  StrategyValidationError,
} from "../types/strategy.types";

export abstract class BaseStrategy {
  constructor(protected context: StrategyContext) {}

  abstract validateAvailability(): Nullable<StrategyValidationError>;
  abstract onBeforeStart(): Promise<void>;
  abstract setPhase(phase: OverlayPhase): Promise<void>;
  abstract handleTranscript(
    params: HandleTranscriptParams,
  ): Promise<HandleTranscriptResult>;
  abstract shouldStoreTranscript(): boolean;

  abstract cleanup(): Promise<void>;
}
