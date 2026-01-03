import type { OverlayPhase } from "../types/overlay.types";
import type {
  HandleTranscriptParams,
  HandleTranscriptResult,
  RecordingContext,
} from "./recording.types";

export abstract class BaseRecordingStrategy {
  constructor(protected context: RecordingContext) {}

  abstract onBeforeStart(): Promise<void>;
  abstract setPhase(phase: OverlayPhase): Promise<void>;
  abstract handleTranscript(
    params: HandleTranscriptParams,
  ): Promise<HandleTranscriptResult>;

  /**
   * Called when the strategy is being disposed (on exit or when switching modes)
   */
  abstract cleanup(): Promise<void>;
}
