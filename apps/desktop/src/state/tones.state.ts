import type { Nullable } from "@repo/types";

export type TonesState = {
  selectedToneId: Nullable<string>;
  isCreating: boolean;
};

export const INITIAL_TONES_STATE: TonesState = {
  selectedToneId: null,
  isCreating: false,
};
