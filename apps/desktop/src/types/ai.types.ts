export type ProcessingMode = "local" | "api" | "cloud";
export type PostProcessingMode = "none" | "api" | "cloud";

export const DEFAULT_PROCESSING_MODE: ProcessingMode = "local";
export const DEFAULT_MODEL_SIZE = "base";
export const CPU_DEVICE_VALUE = "cpu";
export const DEFAULT_POST_PROCESSING_MODE: PostProcessingMode = "none";
