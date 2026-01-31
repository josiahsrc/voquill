export type Nullable<T> = T | null;

export type EmptyObject = Record<string, never>;

export type Replace<T, S, D> = {
  [K in keyof T]: T[K] extends S
    ? D
    : T[K] extends S | null
      ? D | null
      : T[K] extends S | undefined
        ? D | undefined
        : T[K] extends S | null | undefined
          ? D | null | undefined
          : T[K];
};

export type JsonResponse = {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
};

export type TranscriptionMode = "local" | "api" | "cloud";

export type PostProcessingMode = "none" | "api" | "cloud";

export type AgentMode = PostProcessingMode;

export type DictationPillVisibility = "hidden" | "while_active" | "persistent";

export type PullStatus = "in_progress" | "error" | "complete";
