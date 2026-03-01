import { CPU_DEVICE_VALUE } from "../types/ai.types";
import { isMacOS } from "./env.utils";

export type LocalWhisperModel =
  | "tiny"
  | "base"
  | "small"
  | "medium"
  | "large"
  | "turbo";

export const DEFAULT_LOCAL_WHISPER_MODEL: LocalWhisperModel = "tiny";
export const LOCAL_WHISPER_MODELS: LocalWhisperModel[] = [
  "tiny",
  "base",
  "small",
  "medium",
  "turbo",
  "large",
];

export const normalizeLocalWhisperModel = (
  value: string | null | undefined,
): LocalWhisperModel => {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "tiny" || normalized === "tiny.en") {
    return "tiny";
  }

  if (normalized === "base" || normalized === "base.en") {
    return "base";
  }

  if (normalized === "small" || normalized === "small.en") {
    return "small";
  }

  if (normalized === "medium" || normalized === "medium.en") {
    return "medium";
  }

  if (normalized === "large" || normalized === "large-v3") {
    return "large";
  }

  if (
    normalized === "turbo" ||
    normalized === "large-turbo" ||
    normalized === "large_v3_turbo" ||
    normalized === "large-v3-turbo"
  ) {
    return "turbo";
  }

  return DEFAULT_LOCAL_WHISPER_MODEL;
};

export const isGpuPreferredTranscriptionDevice = (
  device: string | null | undefined,
): boolean => {
  if (isMacOS()) {
    return false;
  }

  const normalized = device?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    normalized === "gpu" ||
    normalized.startsWith("gpu:") ||
    normalized.startsWith("gpu-")
  );
};

export const supportsGpuTranscriptionDevice = (): boolean => !isMacOS();

export const normalizeTranscriptionDevice = (
  device: string | null | undefined,
): string => {
  const normalized = device?.trim().toLowerCase();
  if (!normalized) {
    return CPU_DEVICE_VALUE;
  }

  const normalizedLegacyGpu = normalized.replace(/^gpu-(\d+)$/, "gpu:$1");
  const normalizedLegacyCpu = normalizedLegacyGpu.replace(/^cpu-(\d+)$/, "cpu:$1");

  if (
    normalizedLegacyCpu === CPU_DEVICE_VALUE ||
    normalizedLegacyCpu.startsWith("cpu:")
  ) {
    return normalizedLegacyCpu;
  }

  if (!supportsGpuTranscriptionDevice()) {
    return CPU_DEVICE_VALUE;
  }

  if (normalizedLegacyCpu === "gpu" || normalizedLegacyCpu.startsWith("gpu:")) {
    return normalizedLegacyCpu;
  }

  return CPU_DEVICE_VALUE;
};

export const getTranscriptionSidecarDeviceId = (
  device: string | null | undefined,
): string | undefined => {
  const normalized = normalizeTranscriptionDevice(device);
  return normalized.includes(":") ? normalized : undefined;
};
