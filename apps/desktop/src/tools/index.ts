import type { ToolInfo } from "@repo/types";
import type { BaseTool } from "./tool.base";
import { PasteTool } from "./tool.paste";

export function createTool(info: ToolInfo): BaseTool {
  if (info.id === "paste") {
    return new PasteTool(info);
  }

  throw new Error(`No tool implementation for: ${info.id}`);
}
