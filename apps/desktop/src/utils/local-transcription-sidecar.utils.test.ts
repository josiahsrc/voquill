import { describe, expect, it } from "vitest";

import {
  getTranscriptionSidecarDeviceId,
  isGpuPreferredTranscriptionDevice,
  normalizeTranscriptionDevice,
  normalizeLocalWhisperModel,
  supportsGpuTranscriptionDevice,
} from "./local-transcription.utils";

describe("local-transcription-sidecar manager helpers", () => {
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
    expect(isGpuPreferredTranscriptionDevice("cpu:0")).toBe(false);
    expect(isGpuPreferredTranscriptionDevice("gpu")).toBe(true);
    expect(isGpuPreferredTranscriptionDevice("gpu:0")).toBe(true);
    expect(isGpuPreferredTranscriptionDevice("gpu-0")).toBe(true);
  });

  it("advertises GPU selection support", () => {
    expect(supportsGpuTranscriptionDevice()).toBe(true);
  });

  it("normalizes transcription devices while preserving concrete IDs", () => {
    expect(normalizeTranscriptionDevice("cpu")).toBe("cpu");
    expect(normalizeTranscriptionDevice("cpu:0")).toBe("cpu:0");
    expect(normalizeTranscriptionDevice("gpu")).toBe("gpu");
    expect(normalizeTranscriptionDevice("gpu:2")).toBe("gpu:2");
    expect(normalizeTranscriptionDevice("gpu-2")).toBe("gpu:2");
    expect(normalizeTranscriptionDevice("unknown")).toBe("cpu");
  });

  it("extracts sidecar device IDs only for concrete selections", () => {
    expect(getTranscriptionSidecarDeviceId("cpu")).toBeUndefined();
    expect(getTranscriptionSidecarDeviceId("gpu")).toBeUndefined();
    expect(getTranscriptionSidecarDeviceId("cpu:0")).toBe("cpu:0");
    expect(getTranscriptionSidecarDeviceId("gpu:1")).toBe("gpu:1");
  });
});
