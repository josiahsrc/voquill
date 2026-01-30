import type { HandlerInput, HandlerName, HandlerOutput } from "@repo/functions";
import { getAppState } from "../store";

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
