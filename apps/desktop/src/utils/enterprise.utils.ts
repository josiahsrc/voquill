import type { HandlerInput, HandlerName, HandlerOutput } from "@repo/functions";
import type { Nullable } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";

type EnterpriseConfig = {
  gatewayUrl: string;
};

let _cachedConfig: Nullable<EnterpriseConfig> = null;

export async function loadEnterpriseConfig(): Promise<void> {
  const raw = await invoke<string | null>("read_enterprise_config").catch(
    () => null,
  );

  if (raw) {
    try {
      _cachedConfig = JSON.parse(raw) as EnterpriseConfig;
    } catch {
      _cachedConfig = null;
    }
  } else {
    _cachedConfig = null;
  }
}

export function getEnterpriseConfig(): Nullable<EnterpriseConfig> {
  return _cachedConfig;
}

export function getIsEnterpriseEnabled(): boolean {
  return Boolean(getEnterpriseConfig());
}

export async function invokeEnterprise<N extends HandlerName>(
  name: N,
  input: HandlerInput<N>,
): Promise<HandlerOutput<N>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const config = getEnterpriseConfig();
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
