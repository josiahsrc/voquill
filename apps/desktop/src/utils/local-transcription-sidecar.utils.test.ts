import { describe, expect, it } from "vitest";
import {
  isGpuPreferredTranscriptionDevice,
  normalizeLocalWhisperModel,
} from "./local-transcription.utils";

describe("local-transcription-sidecar manager helpers", () => {
  it("normalizes legacy model values to supported sidecar models", () => {
    expect(normalizeLocalWhisperModel("base")).toBe("tiny");
    expect(normalizeLocalWhisperModel("small")).toBe("medium");
    expect(normalizeLocalWhisperModel("large-turbo")).toBe("turbo");
    expect(normalizeLocalWhisperModel("large")).toBe("large");
  });

  it("defaults unknown model values to tiny", () => {
    expect(normalizeLocalWhisperModel("unknown")).toBe("tiny");
    expect(normalizeLocalWhisperModel(null)).toBe("tiny");
  });

  it("treats any non-cpu device value as gpu preference", () => {
    expect(isGpuPreferredTranscriptionDevice("cpu")).toBe(false);
    expect(isGpuPreferredTranscriptionDevice("gpu")).toBe(true);
    expect(isGpuPreferredTranscriptionDevice("gpu-0")).toBe(true);
  });
});
