import type { Nullable } from "@repo/types";

export type TonesState = {
  selectedToneId: Nullable<string>;
  isCreating: boolean;
  viewingToneId: Nullable<string>;
  viewingToneOpen: boolean;
};

export const INITIAL_TONES_STATE: TonesState = {
  selectedToneId: null,
  isCreating: false,
  viewingToneId: null,
  viewingToneOpen: false,
};
