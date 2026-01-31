import type { HandlerInput, HandlerName, HandlerOutput } from "@repo/functions";
import { getAppState } from "../store";
import { getGatewayUrl } from "./env.utils";

export async function invoke<N extends HandlerName>(
  name: N,
  input: HandlerInput<N>,
): Promise<HandlerOutput<N>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getAppState().token;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${getGatewayUrl()}/handler`, {
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
