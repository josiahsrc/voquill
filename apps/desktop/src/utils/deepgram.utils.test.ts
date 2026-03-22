import { describe, expect, it } from "vitest";
import { buildDeepgramWebSocketUrl } from "./deepgram.utils";

describe("buildDeepgramWebSocketUrl", () => {
  it("includes the selected language for streaming transcription", () => {
    const url = new URL(
      buildDeepgramWebSocketUrl({
        sampleRate: 16000,
        language: "fr",
      }),
    );

    expect(url.searchParams.get("language")).toBe("fr");
    expect(url.searchParams.get("sample_rate")).toBe("16000");
    expect(url.searchParams.get("model")).toBe("nova-3");
  });

  it("preserves regional language variants", () => {
    const url = new URL(
      buildDeepgramWebSocketUrl({
        sampleRate: 16000,
        language: "zh-TW",
      }),
    );

    expect(url.searchParams.get("language")).toBe("zh-TW");
  });

  it("omits the language parameter when no language is provided", () => {
    const url = new URL(
      buildDeepgramWebSocketUrl({
        sampleRate: 44100,
      }),
    );

    expect(url.searchParams.has("language")).toBe(false);
    expect(url.searchParams.get("sample_rate")).toBe("44100");
  });
});
