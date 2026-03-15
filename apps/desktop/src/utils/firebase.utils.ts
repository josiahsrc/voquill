import type {
  StreamHandlerInput,
  StreamHandlerName,
} from "@repo/functions";
import type { LlmStreamEvent } from "@repo/types";
import { getEffectiveAuth } from "./auth.utils";
import { getIsEmulators } from "./env.utils";
import { readNdjsonStream } from "./stream.utils";

export function getFunctionUrl(functionName: string): string {
  const projectId =
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "voquill-dev";
  if (getIsEmulators()) {
    return `http://localhost:5001/${projectId}/us-central1/${functionName}`;
  }
  return `https://us-central1-${projectId}.cloudfunctions.net/${functionName}`;
}

export async function* invokeHandlerStream<N extends StreamHandlerName>(
  name: N,
  input: StreamHandlerInput<N>,
): AsyncGenerator<LlmStreamEvent> {
  const user = getEffectiveAuth().currentUser;
  if (!user) throw new Error("Not authenticated");
  const idToken = await user.getIdToken();

  const url = getFunctionUrl("streamHandler");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ name, input }),
  });

  if (!response.ok) {
    throw new Error(
      `Stream handler failed: ${response.status} ${response.statusText}`,
    );
  }

  yield* readNdjsonStream(response);
}
