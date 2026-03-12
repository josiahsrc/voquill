import { createTool } from "@mastra/core/tools";
import { jsonSchema } from "ai";
import type { ToolInfo } from "@repo/types";

const desktopApiUrl =
  process.env.DESKTOP_API_URL || "http://localhost:4112";
const desktopApiKey = process.env.DESKTOP_API_KEY || "dev";

async function callDesktopApi(path: string, options?: RequestInit) {
  const res = await fetch(`${desktopApiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${desktopApiKey}`,
      ...options?.headers,
    },
  });
  return res.json();
}

async function callTool(
  toolId: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const { permission_id } = await callDesktopApi(
    `/tools/${toolId}/permissions`,
    { method: "POST", body: JSON.stringify(params) }
  );

  // Poll for approval
  for (let i = 0; i < 60; i++) {
    const result = await callDesktopApi(
      `/tools/permissions/${permission_id}`
    );

    if (result.status === "denied") {
      return { error: `User denied ${toolId}` };
    }

    if (result.status === "allowed") {
      const execution = await callDesktopApi(`/tools/${toolId}/execute`, {
        method: "POST",
        body: JSON.stringify({ token: result.token }),
      });
      return execution.result;
    }

    // Still pending — wait before polling again
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { error: `Permission timed out for ${toolId}` };
}

export async function fetchTools() {
  const { tools } = (await callDesktopApi("/tools/list")) as {
    tools: ToolInfo[];
  };

  return Object.fromEntries(
    tools.map((tool) =>
      [
        tool.id,
        createTool({
          id: tool.id,
          description: tool.description,
          inputSchema: jsonSchema(tool.schema),
          execute: async (input) => {
            return callTool(tool.id, input as Record<string, unknown>);
          },
        }),
      ] as const
    )
  );
}
