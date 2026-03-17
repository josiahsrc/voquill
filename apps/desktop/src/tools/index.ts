import type { ToolInfo } from "@repo/types";
import type { BaseTool } from "./base.tool";
import { EndConversationTool } from "./end-conversation.tool";
import { GetAccessibilityInfoTool } from "./get-accessibility-info.tool";
import { PasteTool } from "./paste.tool";
import { RunTerminalCommandTool } from "./run-terminal-command.tool";

export function createTool(info: ToolInfo): BaseTool {
  if (info.id === "paste") {
    return new PasteTool(info);
  }
  if (info.id === "get_accessibility_info") {
    return new GetAccessibilityInfoTool(info);
  }
  if (info.id === "end_conversation") {
    return new EndConversationTool(info);
  }
  if (info.id === "run_terminal_command") {
    return new RunTerminalCommandTool(info);
  }

  throw new Error(`No tool implementation for: ${info.id}`);
}
