import type { Transcription } from "@voquill/types";
import { describe, expect, it } from "vitest";
import {
  findLatestPasteableTranscript,
  getLatestPasteableTranscriptFromState,
  getPasteableTranscript,
  resolveReplayPasteKeybind,
} from "./paste-last-transcription.utils";

const transcription = (id: string, transcript: string): Transcription => ({
  id,
  transcript,
  createdAt: "2026-04-08T00:00:00.000Z",
  createdByUserId: "user",
  isDeleted: false,
});

describe("paste last transcription utils", () => {
  it("trims usable transcripts", () => {
    expect(getPasteableTranscript(transcription("one", "  hello  "))).toBe(
      "hello",
    );
  });

  it("skips empty and failed transcripts", () => {
    expect(getPasteableTranscript(transcription("empty", "  "))).toBeNull();
    expect(
      getPasteableTranscript(transcription("failed", "[Transcription Failed]")),
    ).toBeNull();
  });

  it("finds the newest pasteable transcript from ordered candidates", () => {
    expect(
      findLatestPasteableTranscript([
        transcription("empty", ""),
        transcription("failed", "[Transcription Failed]"),
        transcription("latest", "use this"),
        transcription("older", "not this"),
      ]),
    ).toBe("use this");
  });

  it("finds the newest pasteable transcript from state order", () => {
    expect(
      getLatestPasteableTranscriptFromState({
        transcriptionById: {
          older: transcription("older", "old value"),
          latest: transcription("latest", "new value"),
        },
        transcriptions: {
          transcriptionIds: ["latest", "missing", "older"],
        },
      }),
    ).toBe("new value");
  });

  it("resolves replay paste keybind precedence", () => {
    expect(
      resolveReplayPasteKeybind({
        supportsPasteKeybinds: "disabled",
        userPasteKeybind: "Ctrl+V",
        appTargetPasteKeybind: "Ctrl+Shift+V",
      }),
    ).toBeNull();

    expect(
      resolveReplayPasteKeybind({
        supportsPasteKeybinds: "global",
        userPasteKeybind: "Ctrl+V",
        appTargetPasteKeybind: "Ctrl+Shift+V",
      }),
    ).toBe("Ctrl+V");

    expect(
      resolveReplayPasteKeybind({
        supportsPasteKeybinds: "per-app",
        userPasteKeybind: "Ctrl+V",
        appTargetPasteKeybind: "Ctrl+Shift+V",
      }),
    ).toBe("Ctrl+Shift+V");

    expect(
      resolveReplayPasteKeybind({
        supportsPasteKeybinds: "per-app",
        userPasteKeybind: "Ctrl+V",
      }),
    ).toBe("Ctrl+V");
  });
});
