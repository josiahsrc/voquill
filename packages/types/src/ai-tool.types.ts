import type { JSONSchema } from "./json-schema.types";

export interface ToolInfo {
  id: string;
  description: string;
  schema: JSONSchema;
}

export type ToolPermissionStatus = "pending" | "allowed" | "denied";
