import type { ToolInfo } from "@repo/types";
import type { BaseTool } from "./base.tool";
import { GetAccessibilityInfoTool } from "./get-accessibility-info.tool";
import { PasteTool } from "./paste.tool";

export function createTool(info: ToolInfo): BaseTool {
  if (info.id === "paste") {
    return new PasteTool(info);
  }
  if (info.id === "get_accessibility_info") {
    return new GetAccessibilityInfoTool(info);
  }

  throw new Error(`No tool implementation for: ${info.id}`);
}
