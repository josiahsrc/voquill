import { describe, expect, it } from "vitest";
import {
  getDefaultHotkeyCombosForAction,
  getIsPasteLastTranscriptionHotkeyEnabled,
  PASTE_LAST_TRANSCRIPTION_HOTKEY,
  PASTE_LAST_TRANSCRIPTION_SUGGESTED_KEYS,
} from "./keyboard.utils";

describe("paste last transcription hotkey", () => {
  it("does not register a default hotkey", () => {
    expect(
      getDefaultHotkeyCombosForAction(PASTE_LAST_TRANSCRIPTION_HOTKEY),
    ).toEqual([]);
  });

  it("keeps Alt+Shift+Z as the opt-in suggested hotkey", () => {
    expect(PASTE_LAST_TRANSCRIPTION_SUGGESTED_KEYS).toEqual([
      "Alt",
      "ShiftLeft",
      "KeyZ",
    ]);
  });

  it("is disabled until a user-saved hotkey exists", () => {
    expect(getIsPasteLastTranscriptionHotkeyEnabled({ hotkeyById: {} })).toBe(
      false,
    );
    expect(
      getIsPasteLastTranscriptionHotkeyEnabled({
        hotkeyById: {
          empty: {
            id: "empty",
            actionName: PASTE_LAST_TRANSCRIPTION_HOTKEY,
            keys: [],
          },
        },
      }),
    ).toBe(false);
  });

  it("is enabled when a user-saved hotkey exists", () => {
    expect(
      getIsPasteLastTranscriptionHotkeyEnabled({
        hotkeyById: {
          replay: {
            id: "replay",
            actionName: PASTE_LAST_TRANSCRIPTION_HOTKEY,
            keys: PASTE_LAST_TRANSCRIPTION_SUGGESTED_KEYS,
          },
        },
      }),
    ).toBe(true);
  });
});
