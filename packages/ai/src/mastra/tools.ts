import { createTool } from "@mastra/core/tools";
import { jsonSchema } from "ai";
import type {
  ToolsListResult,
  ToolsPermissionResult,
  ToolsPermissionStatusResult,
} from "@repo/types";
import { getSidecarIpcClient } from "../sidecar/client";

const PERMISSION_POLL_INTERVAL_MS = 500;
const PERMISSION_MAX_POLLS = 120;

const ipc = getSidecarIpcClient();

async function callTool(
  toolId: string,
  params: Record<string, unknown>,
  conversationId: string,
): Promise<unknown> {
  const { permissionId } = await ipc.request<ToolsPermissionResult>(
    "tools/permission",
    {
      tool: toolId,
      params,
      conversationId,
    },
  );

  // Poll for approval
  for (let i = 0; i < PERMISSION_MAX_POLLS; i++) {
    const result = await ipc.request<ToolsPermissionStatusResult>(
      "tools/permission-status",
      {
        permissionId,
      },
    );

    if (result.status === "denied") {
      return { error: `User denied ${toolId}` };
    }

    if (result.status === "allowed" && result.token) {
      return ipc.request("tools/execute", {
        tool: toolId,
        token: result.token,
      });
    }

    // Still pending — wait before polling again
    await new Promise((resolve) =>
      setTimeout(resolve, PERMISSION_POLL_INTERVAL_MS),
    );
  }

  return { error: `Permission timed out for ${toolId}` };
}

export async function fetchTools(conversationId: string) {
  const { tools } = await ipc.request<ToolsListResult>("tools/list", {
    conversationId,
  });

  return Object.fromEntries(
    tools.map(
      (tool) =>
        [
          tool.id,
          createTool({
            id: tool.id,
            description: tool.description,
            inputSchema: jsonSchema(tool.schema),
            execute: async (input) => {
              return callTool(
                tool.id,
                input as Record<string, unknown>,
                conversationId,
              );
            },
          }),
        ] as const,
    ),
  );
}
