import { ActionStatus } from "../types/state.types";

export type TranscriptionsState = {
  transcriptionIds: string[];
  status: ActionStatus
};

export const INITIAL_TRANSCRIPTIONS_STATE: TranscriptionsState = {
  transcriptionIds: [],
  status: "idle",
};
