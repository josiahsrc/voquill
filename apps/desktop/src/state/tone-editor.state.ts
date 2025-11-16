import type { Nullable } from "@repo/types";

export type ToneEditorMode = "create" | "edit";

export type ToneEditorState = {
  open: boolean;
  mode: ToneEditorMode;
  toneId: Nullable<string>;
  targetId: Nullable<string>;
};

export const INITIAL_TONE_EDITOR_STATE: ToneEditorState = {
  open: false,
  mode: "create",
  toneId: null,
  targetId: null,
};
