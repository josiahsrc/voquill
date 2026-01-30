import type { HandlerInput, HandlerName, HandlerOutput } from "@repo/functions";
import type { Nullable } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { getAppState } from "../store";

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

export async function invokeEnterprise<N extends HandlerName>(
  name: N,
  input: HandlerInput<N>,
): Promise<HandlerOutput<N>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const { token, gatewayUrl } = getAppState().enterprise;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

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
