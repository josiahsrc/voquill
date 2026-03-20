import type {
  HandlerInput,
  HandlerName,
  HandlerOutput,
  StreamHandlerInput,
  StreamHandlerName,
} from "@repo/functions";
import type { LlmStreamEvent, Nullable } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { AppState } from "../state/app.state";
import { readNdjsonStream } from "./stream.utils";

type EnterpriseTarget = {
  gatewayUrl: string;
};

let _cachedTarget: Nullable<EnterpriseTarget> = null;

export async function loadEnterpriseTarget(): Promise<unknown> {
  const [path, raw] = await invoke<[string, string | null]>(
    "read_enterprise_target",
  ).catch(() => {
    return [null, null] as [null, null];
  });

  if (raw) {
    try {
      _cachedTarget = JSON.parse(raw) as EnterpriseTarget;
    } catch {
      _cachedTarget = null;
    }
  } else {
    _cachedTarget = null;
  }

  return { path, raw };
}

export function getEnterpriseTarget(): Nullable<EnterpriseTarget> {
  return _cachedTarget;
}

export function getIsEnterpriseEnabled(): boolean {
  return Boolean(getEnterpriseTarget());
}

export async function invokeEnterprise<N extends HandlerName>(
  name: N,
  input: HandlerInput<N>,
): Promise<HandlerOutput<N>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const config = getEnterpriseTarget();
  if (!config) {
    throw new Error("Enterprise configuration is not loaded");
  }

  const token = localStorage.getItem("enterprise_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const gatewayUrl = config.gatewayUrl;
  if (!gatewayUrl) {
    throw new Error("Enterprise gateway URL is not configured");
  }

  const res = await fetch(`${gatewayUrl}/handler`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, input }),
  });

  const body = await res.json();
  if (!body.success) {
    throw new Error(`${res.status}: ${body.error}`);
  }
  return body.data;
}

export async function* invokeEnterpriseStream<N extends StreamHandlerName>(
  name: N,
  input: StreamHandlerInput<N>,
): AsyncGenerator<LlmStreamEvent> {
  const config = getEnterpriseTarget();
  if (!config) {
    throw new Error("Enterprise configuration is not loaded");
  }

  const gatewayUrl = config.gatewayUrl;
  if (!gatewayUrl) {
    throw new Error("Enterprise gateway URL is not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("enterprise_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${gatewayUrl}/stream-handler`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, input }),
  });

  if (!response.ok) {
    throw new Error(
      `Stream handler failed: ${response.status} ${await response.text()}`,
    );
  }

  yield* readNdjsonStream(response);
}

export const getAllowsChangePostProcessing = (state: AppState): boolean => {
  return state.enterpriseConfig?.allowChangePostProcessing ?? true;
};

export const getAllowsChangeTranscription = (state: AppState): boolean => {
  return state.enterpriseConfig?.allowChangeTranscriptionMethod ?? true;
};

export const getEnterpriseAssistantModeEnabled = (state: AppState): boolean => {
  return state.enterpriseConfig?.assistantModeEnabled ?? false;
};

export const getEnterprisePowerModeEnabled = (state: AppState): boolean => {
  return state.enterpriseConfig?.powerModeEnabled ?? false;
};

export const getAllowsMultiDeviceMode = (state: AppState): boolean => {
  return state.enterpriseConfig?.allowMultiDeviceMode ?? true;
};

export const getAllowChangeStylingMode = (state: AppState): boolean => {
  if (!state.enterpriseConfig) {
    return true;
  }

  return state.enterpriseConfig.stylingMode === "any";
};
