import type { Nullable } from "@repo/types";

export type TonesState = {
  selectedToneId: Nullable<string>;
  storedToneIds: string[];
  isCreating: boolean;
};

export const INITIAL_TONES_STATE: TonesState = {
  selectedToneId: null,
  storedToneIds: [],
  isCreating: false,
};
