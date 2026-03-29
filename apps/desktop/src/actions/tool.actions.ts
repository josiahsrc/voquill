import type {
  ToolPermission,
  ToolPermissionResolution,
  ToolPermissionStatus,
} from "@voquill/types";
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
    createdAt: Date.now(),
  };
  produceAppState((draft) => {
    registerToolPermission(draft, permission);
  });
  return permission.id;
};

export const resolveToolPermission = (
  permissionId: string,
  status: ToolPermissionResolution,
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

const PERMISSION_TIMEOUT_MS = 60_000;

export const getToolPermissionStatus = (
  permissionId: string,
): { status: ToolPermissionStatus; token?: string } | undefined => {
  const state = getAppState();
  const permission = state.toolPermissionById[permissionId];
  if (!permission) return undefined;

  if (
    permission.status === "pending" &&
    Date.now() - permission.createdAt >= PERMISSION_TIMEOUT_MS
  ) {
    resolveToolPermission(permissionId, "denied");
    return { status: "denied" };
  }

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
): Promise<Record<string, unknown>> => {
  const state = getAppState();
  const toolInfo = state.toolInfoById[toolId];
  if (!toolInfo) {
    throw new Error(`Unknown tool: ${toolId}`);
  }
  const tool = createTool(toolInfo);
  return await tool.execute(params);
};

export const setToolAlwaysAllow = (opts: {
  toolId: string;
  params: Record<string, unknown>;
  allowed: boolean;
}): void => {
  const state = getAppState();
  const toolInfo = state.toolInfoById[opts.toolId];
  if (!toolInfo) return;
  const tool = createTool(toolInfo);
  tool.setAlwaysAllow(opts.params, opts.allowed);
};
