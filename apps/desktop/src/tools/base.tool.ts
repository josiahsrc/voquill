import type { ToolInfo } from "@voquill/types";

export type ToolResult = Record<string, unknown>;

export abstract class BaseTool {
  constructor(public readonly info: ToolInfo) {}

  abstract execute(params: Record<string, unknown>): Promise<ToolResult>;

  abstract getAlwaysAllow(params: Record<string, unknown>): boolean;

  abstract setAlwaysAllow(
    params: Record<string, unknown>,
    allowed: boolean,
  ): void;
}
