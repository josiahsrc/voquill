import { invoke } from "@tauri-apps/api/core";
import type { ToolResult } from "../types/agent.types";
import { WriteToTextFieldParamsSchema } from "../types/tool.types";
import { BaseTool } from "./base.tool";

export class WriteToTextFieldTool extends BaseTool {
  readonly name = "write_to_text_field";
  readonly description =
    "Replaces the entire content of the currently focused text field with the provided text.";
  readonly parametersSchema = WriteToTextFieldParamsSchema;

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { text } = args as { text: string };
      await invoke("set_accessibility_text", { text });
      return {
        success: true,
        output: "Text written to field successfully.",
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to write to text field: ${String(error)}`,
      };
    }
  }
}
