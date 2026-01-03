import { invoke } from "@tauri-apps/api/core";
import type { ToolResult } from "../types/agent.types";
import { GetAccessibilityInfoParamsSchema } from "../types/tool.types";
import { BaseTool } from "./base.tool";

type AccessibilityInfo = {
  cursorPosition: number | null;
  selectionLength: number | null;
  textContent: string | null;
};

export class GetAccessibilityInfoTool extends BaseTool {
  readonly name = "get_accessibility_info";
  readonly description =
    "Get information about the currently focused text field, including cursor position, selected text length, and text content.";
  readonly parametersSchema = GetAccessibilityInfoParamsSchema;

  async execute(_args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const info = await invoke<AccessibilityInfo>("get_accessibility_info");

      const parts: string[] = [];

      if (info.textContent !== null) {
        parts.push(`Text content: "${info.textContent}"`);
      } else {
        parts.push("Text content: (not available)");
      }

      if (info.cursorPosition !== null) {
        parts.push(`Cursor position: ${info.cursorPosition}`);
      }

      if (info.selectionLength !== null && info.selectionLength > 0) {
        parts.push(`Selection length: ${info.selectionLength}`);
      }

      if (parts.length === 1 && info.textContent === null) {
        return {
          success: false,
          output:
            "Could not get accessibility info. No text field is focused or accessibility permissions may be required.",
        };
      }

      return {
        success: true,
        output: parts.join("\n"),
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to get accessibility info: ${String(error)}`,
      };
    }
  }
}
