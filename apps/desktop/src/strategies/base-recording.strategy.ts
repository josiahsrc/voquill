import type { OverlayPhase } from "../types/overlay.types";
import type {
  CompleteParams,
  CompleteResult,
  PostProcessParams,
  PostProcessOutput,
  RecordingContext,
} from "./recording.types";

export abstract class BaseRecordingStrategy {
  constructor(protected context: RecordingContext) {}

  abstract onBeforeStart(): Promise<void>;
  abstract setPhase(phase: OverlayPhase): Promise<void>;
  abstract postProcess(params: PostProcessParams): Promise<PostProcessOutput>;
  abstract onComplete(params: CompleteParams): Promise<CompleteResult>;

  /**
   * Called when the strategy is being disposed (on exit or when switching modes)
   */
  abstract cleanup(): Promise<void>;
}
