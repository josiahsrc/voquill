import { CPU_DEVICE_VALUE } from "../types/ai.types";

export type LocalWhisperModel = "tiny" | "medium" | "large" | "turbo";

export const DEFAULT_LOCAL_WHISPER_MODEL: LocalWhisperModel = "tiny";
export const LOCAL_WHISPER_MODELS: LocalWhisperModel[] = [
  "tiny",
  "medium",
  "turbo",
  "large",
];

export const normalizeLocalWhisperModel = (
  value: string | null | undefined,
): LocalWhisperModel => {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "tiny" || normalized === "base") {
    return "tiny";
  }

  if (normalized === "medium" || normalized === "small") {
    return "medium";
  }

  if (normalized === "large") {
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
  const normalized = device?.trim().toLowerCase();
  return !!normalized && normalized !== CPU_DEVICE_VALUE;
};
