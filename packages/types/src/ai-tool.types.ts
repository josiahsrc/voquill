import type { JSONSchema } from "./json-schema.types";

export interface ToolInfo {
  id: string;
  description: string;
  schema: JSONSchema;
}

export type ToolPermissionStatus = "pending" | "allowed" | "denied";

export type ToolPermissionResolution = Extract<
  ToolPermissionStatus,
  "allowed" | "denied"
>;

export interface ToolPermission {
  id: string;
  toolId: string;
  params: Record<string, unknown>;
  status: ToolPermissionStatus;
  token?: string;
  conversationId: string;
}
