import type { ToolPermission, ToolPermissionStatus } from "@repo/types";
import { getToolRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import { createTool } from "../tools";
import { registerToolInfos, registerToolPermission } from "../utils/app.utils";

export const loadTools = async (): Promise<void> => {
  const toolInfos = await getToolRepo().listToolInfos();
  produceAppState((draft) => {
    registerToolInfos(draft, toolInfos);
  });
};

export const requestToolPermission = (
  toolId: string,
  params: Record<string, unknown>,
  conversationId: string,
): string => {
  const permission: ToolPermission = {
    id: crypto.randomUUID(),
    toolId,
    params,
    status: "pending",
    conversationId,
  };
  produceAppState((draft) => {
    registerToolPermission(draft, permission);
  });
  return permission.id;
};

export const resolveToolPermission = (
  permissionId: string,
  status: Extract<ToolPermissionStatus, "allowed" | "denied">,
): void => {
  produceAppState((draft) => {
    const permission = draft.toolPermissionById[permissionId];
    if (!permission || permission.status !== "pending") return;
    permission.status = status;
    if (status === "allowed") {
      permission.token = crypto.randomUUID();
    }
  });
};

export const getToolPermissionStatus = (
  permissionId: string,
): { status: ToolPermissionStatus; token?: string } | undefined => {
  const state = getAppState();
  const permission = state.toolPermissionById[permissionId];
  if (!permission) return undefined;
  return { status: permission.status, token: permission.token };
};

export const consumeToolToken = (
  toolId: string,
  token: string,
): Record<string, unknown> | undefined => {
  const state = getAppState();
  const permission = Object.values(state.toolPermissionById).find(
    (p) => p.token === token && p.toolId === toolId,
  );
  if (!permission) return undefined;

  const params = permission.params;
  produceAppState((draft) => {
    delete draft.toolPermissionById[permission.id];
  });
  return params;
};

export const executeTool = async (
  toolId: string,
  params: Record<string, unknown>,
): Promise<void> => {
  const state = getAppState();
  const toolInfo = state.toolInfoById[toolId];
  if (!toolInfo) {
    throw new Error(`Unknown tool: ${toolId}`);
  }
  const tool = createTool(toolInfo);
  await tool.execute(params);
};
