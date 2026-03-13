export type AiSidecarStatus = "idle" | "starting" | "running" | "error";

export type AiSidecarState = {
  status: AiSidecarStatus;
  port: number | null;
  apiKey: string | null;
  errorMessage: string | null;
};

export const INITIAL_AI_SIDECAR_STATE: AiSidecarState = {
  status: "idle",
  port: null,
  apiKey: null,
  errorMessage: null,
};
