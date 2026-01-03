import type { RecordingMode } from "../state/app.state";
import { AgentRecordingStrategy } from "./agent-recording.strategy";
import { BaseRecordingStrategy } from "./base-recording.strategy";
import { DictationRecordingStrategy } from "./dictation-recording.strategy";
import type { RecordingContext } from "./recording.types";

export type {
  RecordingContext,
  HandleTranscriptResult,
} from "./recording.types";
export { BaseRecordingStrategy } from "./base-recording.strategy";
export { DictationRecordingStrategy } from "./dictation-recording.strategy";
export { AgentRecordingStrategy } from "./agent-recording.strategy";

export const getRecordingStrategy = (
  mode: RecordingMode,
  context: RecordingContext,
): BaseRecordingStrategy => {
  return mode === "agent"
    ? new AgentRecordingStrategy(context)
    : new DictationRecordingStrategy(context);
};
