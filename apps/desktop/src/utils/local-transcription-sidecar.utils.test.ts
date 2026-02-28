import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./env.utils", () => ({
  isMacOS: vi.fn(() => false),
}));

import {
  isGpuPreferredTranscriptionDevice,
  normalizeLocalWhisperModel,
} from "./local-transcription.utils";
import { isMacOS } from "./env.utils";

describe("local-transcription-sidecar manager helpers", () => {
  beforeEach(() => {
    vi.mocked(isMacOS).mockReturnValue(false);
  });

  it("normalizes model values to supported sidecar models", () => {
    expect(normalizeLocalWhisperModel("tiny")).toBe("tiny");
    expect(normalizeLocalWhisperModel("tiny.en")).toBe("tiny");
    expect(normalizeLocalWhisperModel("base")).toBe("base");
    expect(normalizeLocalWhisperModel("base.en")).toBe("base");
    expect(normalizeLocalWhisperModel("small")).toBe("small");
    expect(normalizeLocalWhisperModel("small.en")).toBe("small");
    expect(normalizeLocalWhisperModel("medium")).toBe("medium");
    expect(normalizeLocalWhisperModel("medium.en")).toBe("medium");
    expect(normalizeLocalWhisperModel("large-turbo")).toBe("turbo");
    expect(normalizeLocalWhisperModel("large-v3")).toBe("large");
    expect(normalizeLocalWhisperModel("large")).toBe("large");
  });

  it("defaults unknown model values to tiny", () => {
    expect(normalizeLocalWhisperModel("unknown")).toBe("tiny");
    expect(normalizeLocalWhisperModel(null)).toBe("tiny");
  });

  it("treats any non-cpu device value as gpu preference on supported OSes", () => {
    expect(isGpuPreferredTranscriptionDevice("cpu")).toBe(false);
    expect(isGpuPreferredTranscriptionDevice("gpu")).toBe(true);
    expect(isGpuPreferredTranscriptionDevice("gpu-0")).toBe(true);
  });

  it("always uses CPU preference on macOS", () => {
    vi.mocked(isMacOS).mockReturnValue(true);
    expect(isGpuPreferredTranscriptionDevice("gpu")).toBe(false);
    expect(isGpuPreferredTranscriptionDevice("gpu-0")).toBe(false);
    expect(isGpuPreferredTranscriptionDevice("cpu")).toBe(false);
  });
});
