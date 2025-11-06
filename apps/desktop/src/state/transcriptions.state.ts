import { Nullable } from "@repo/types";
import { ActionStatus } from "../types/state.types";

export type TranscriptionsState = {
  transcriptionIds: string[];
  status: ActionStatus;
  detailsDialogOpen: boolean;
  detailsDialogTranscriptionId: Nullable<string>;
};

export const INITIAL_TRANSCRIPTIONS_STATE: TranscriptionsState = {
  transcriptionIds: [],
  status: "idle",
  detailsDialogOpen: false,
  detailsDialogTranscriptionId: null,
};
