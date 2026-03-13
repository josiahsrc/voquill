import type { ToolInfo } from "@repo/types";

export type ToolResult = Record<string, unknown>;

export abstract class BaseTool {
  constructor(public readonly info: ToolInfo) {}

  abstract execute(params: Record<string, unknown>): Promise<ToolResult>;
}
