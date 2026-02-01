import type { Nullable } from "@repo/types";

export type TonesState = {
  selectedToneId: Nullable<string>;
  storedToneIds: string[];
  isCreating: boolean;
  viewingToneId: Nullable<string>;
  viewingToneOpen: boolean;
};

export const INITIAL_TONES_STATE: TonesState = {
  selectedToneId: null,
  storedToneIds: [],
  isCreating: false,
  viewingToneId: null,
  viewingToneOpen: false,
};
