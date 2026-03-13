import type {
  LlmChatRequest,
  SidecarRequest,
  SidecarResponse,
} from "@repo/types";
import { getAgentRepo } from "../repos";
import { getAppState } from "../store";

import {
  consumeToolToken,
  executeTool,
  getToolPermissionStatus,
  requestToolPermission,
} from "./tool.actions";
import { getLogger } from "../utils/log.utils";

export type SidecarResponder = (response: SidecarResponse) => Promise<void>;

export async function handleSidecarRequest(
  request: SidecarRequest,
  respond: SidecarResponder,
): Promise<void> {
  getLogger().info(`[sidecar-handler] Received request: ${request.type}`);

  try {
    switch (request.type) {
      case "tools/list": {
        const state = getAppState();
        const tools = Object.values(state.toolInfoById);
        return await respond({
          id: request.id,
          status: "ok",
          result: { tools },
        });
      }
      case "tools/permission": {
        const state = getAppState();
        if (!state.toolInfoById[request.tool]) {
          return await respond({
            id: request.id,
            status: "error",
            error: `Unknown tool: ${request.tool}`,
          });
        }
        const permissionId = requestToolPermission(
          request.tool,
          request.params,
          request.conversationId,
        );
        return await respond({
          id: request.id,
          status: "ok",
          result: { permissionId },
        });
      }
      case "tools/permission-status": {
        const status = getToolPermissionStatus(request.permissionId);
        if (!status) {
          return await respond({
            id: request.id,
            status: "error",
            error: `Unknown permission: ${request.permissionId}`,
          });
        }
        return await respond({
          id: request.id,
          status: "ok",
          result: status,
        });
      }
      case "tools/execute": {
        const params = consumeToolToken(request.tool, request.token);
        if (!params) {
          return await respond({
            id: request.id,
            status: "error",
            error: "Invalid or expired token",
          });
        }
        const toolResult = await executeTool(request.tool, params);
        return await respond({
          id: request.id,
          status: "ok",
          result: toolResult,
        });
      }
      case "llm/chat":
        return await handleLlmChat(request, respond);
      default: {
        const unhandled = request as SidecarRequest;
        return await respond({
          id: unhandled.id,
          status: "error",
          error: `Unsupported sidecar request: ${unhandled.type}`,
        });
      }
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
