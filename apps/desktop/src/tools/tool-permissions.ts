import type { ToolPermissionStatus } from "@repo/types";

interface PermissionRecord {
  toolId: string;
  params: Record<string, unknown>;
  status: ToolPermissionStatus;
  token?: string;
}

const permissions = new Map<string, PermissionRecord>();
const tokenToPermissionId = new Map<string, string>();

export function createPermission(
  toolId: string,
  params: Record<string, unknown>,
  autoApprove: boolean,
): string {
  const permissionId = crypto.randomUUID();
  const record: PermissionRecord = { toolId, params, status: "pending" };

  if (autoApprove) {
    record.status = "allowed";
    record.token = crypto.randomUUID();
    tokenToPermissionId.set(record.token, permissionId);
  }

  permissions.set(permissionId, record);
  return permissionId;
}

export function getPermissionStatus(
  permissionId: string,
): { status: ToolPermissionStatus; token?: string } | undefined {
  const record = permissions.get(permissionId);
  if (!record) return undefined;
  return { status: record.status, token: record.token };
}

export function consumeToken(
  toolId: string,
  token: string,
): Record<string, unknown> | undefined {
  const permissionId = tokenToPermissionId.get(token);
  if (!permissionId) return undefined;

  const record = permissions.get(permissionId);
  if (!record || record.toolId !== toolId) return undefined;

  tokenToPermissionId.delete(token);
  permissions.delete(permissionId);

  return record.params;
}
