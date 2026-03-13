import { invoke } from "@tauri-apps/api/core";
import type { ToolInfo } from "@repo/types";
import { BaseTool, type ToolResult } from "./base.tool";

export class GetAccessibilityInfoTool extends BaseTool {
  constructor(info: ToolInfo) {
    super(info);
  }

  async execute(): Promise<ToolResult> {
    const [textFieldInfo, screenContext] = await Promise.all([
      invoke<{
        cursorPosition: number | null;
        selectionLength: number | null;
        textContent: string | null;
      }>("get_text_field_info"),
      invoke<{ screenContext: string | null }>("get_screen_context"),
    ]);

    return { ...textFieldInfo, ...screenContext };
  }
}
