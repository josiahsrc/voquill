import type { HandlerInput, HandlerName, HandlerOutput } from "@repo/functions";
import type { Nullable } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { AppState } from "../state/app.state";

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

export const getAllowsChangePostProcessing = (state: AppState): boolean => {
  return state.enterpriseConfig?.allowChangePostProcessing ?? true;
};

export const getAllowsChangeTranscription = (state: AppState): boolean => {
  return state.enterpriseConfig?.allowChangeTranscriptionMethod ?? true;
};

export const getAllowsChangeAgentMode = (state: AppState): boolean => {
  return state.enterpriseConfig?.allowChangeAgentMode ?? true;
};

export const getAllowChangeStylingMode = (state: AppState): boolean => {
  if (!state.enterpriseConfig) {
    return true;
  }

  return state.enterpriseConfig.stylingMode === "any";
};
