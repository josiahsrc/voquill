import type { OverlayPhase } from "../types/overlay.types";
import type {
  HandleTranscriptParams,
  HandleTranscriptResult,
  StrategyContext,
} from "../types/strategy.types";

export abstract class BaseStrategy {
  constructor(protected context: StrategyContext) {}

  abstract onBeforeStart(): Promise<void>;
  abstract setPhase(phase: OverlayPhase): Promise<void>;
  abstract handleTranscript(
    params: HandleTranscriptParams,
  ): Promise<HandleTranscriptResult>;

  abstract cleanup(): Promise<void>;
}
