import { emitTo } from "@tauri-apps/api/event";
import { BaseTool, type ToolResult } from "./base.tool";

export class EndConversationTool extends BaseTool {
  async execute(): Promise<ToolResult> {
    await emitTo("main", "assistant-mode-close", {});
    return {};
  }

  getAlwaysAllow(): boolean {
    return true;
  }

  setAlwaysAllow(): void {}
}
