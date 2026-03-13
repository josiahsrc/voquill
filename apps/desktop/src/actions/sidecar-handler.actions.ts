import type { LlmChatRequest, SidecarRequest, SidecarResponse } from "@repo/types";
import { getAgentRepo } from "../repos";
import { getLogger } from "../utils/log.utils";

export type SidecarResponder = (response: SidecarResponse) => Promise<void>;

export async function handleSidecarRequest(
  request: SidecarRequest,
  respond: SidecarResponder,
): Promise<void> {
  getLogger().info(`[sidecar-handler] Received request: ${request.type}`);

  try {
    switch (request.type) {
      case "tools/list":
        return await respond({
          id: request.id,
          status: "ok",
          result: { tools: [] },
        });
      case "llm/chat":
        return await handleLlmChat(request, respond);
      default:
        return await respond({
          id: request.id,
          status: "error",
          error: `Unsupported sidecar request: ${request.type}`,
        });
    }
  } catch (error) {
    getLogger().error(
      `[sidecar-handler] Error handling ${request.type}:`,
      error,
    );
    await respond({
      id: request.id,
      status: "error",
      error: String(error),
    });
  }
}

async function handleLlmChat(
  request: LlmChatRequest,
  respond: SidecarResponder,
): Promise<void> {
  const { repo } = getAgentRepo();
  if (!repo) {
    throw new Error("No LLM provider configured");
  }

  for await (const event of repo.streamChat(request.input)) {
    await respond({ id: request.id, status: "chunk", data: event });
  }

  await respond({ id: request.id, status: "done" });
}
