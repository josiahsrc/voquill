import type { PostProcessingMode, TranscriptionMode } from "@repo/types";

export type { PostProcessingMode, TranscriptionMode };

export const DEFAULT_TRANSCRIPTION_MODE: TranscriptionMode = "local";
export const DEFAULT_MODEL_SIZE = "whisper:base";
export const CPU_DEVICE_VALUE = "cpu";
export const DEFAULT_POST_PROCESSING_MODE: PostProcessingMode = "none";

export type ModelFamily = "whisper" | "parakeet";

export type ModelDescriptor = {
  family: ModelFamily;
  size: string;
  displayName: string;
  helper: string;
};

export const WHISPER_MODELS: ModelDescriptor[] = [
  {
    family: "whisper",
    size: "tiny",
    displayName: "Whisper Tiny (77 MB)",
    helper: "Fastest, lowest accuracy",
  },
  {
    family: "whisper",
    size: "base",
    displayName: "Whisper Base (148 MB)",
    helper: "Great balance of speed and accuracy",
  },
  {
    family: "whisper",
    size: "small",
    displayName: "Whisper Small (488 MB)",
    helper: "Recommended with GPU acceleration",
  },
  {
    family: "whisper",
    size: "medium",
    displayName: "Whisper Medium (1.53 GB)",
    helper: "Highest accuracy, slower on CPU",
  },
];

export const PARAKEET_MODELS: ModelDescriptor[] = [
  {
    family: "parakeet",
    size: "0.6b",
    displayName: "Parakeet 0.6B (640 MB)",
    helper: "NVIDIA GPU required · Fastest inference · Best accuracy",
  },
];

export function encodeModelKey(model: ModelDescriptor): string {
  return `${model.family}:${model.size}`;
}

export function decodeModelKey(key: string): ModelDescriptor | null {
  const [family, size] = key.split(":");
  if (!family || !size) return null;

  const allModels = [...WHISPER_MODELS, ...PARAKEET_MODELS];
  return (
    allModels.find((m) => m.family === family && m.size === size) || null
  );
}

export function normalizeModelSize(raw: string): string {
  // If no colon, it's a legacy value - prefix with "whisper:"
  return raw.includes(":") ? raw : `whisper:${raw}`;
}
