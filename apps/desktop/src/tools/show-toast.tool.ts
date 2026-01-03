import { showToast } from "../actions/toast.actions";
import type { ToolResult } from "../types/agent.types";
import { ShowToastParamsSchema } from "../types/tool.types";
import { BaseTool } from "./base.tool";

export class ShowToastTool extends BaseTool {
  readonly name = "show_toast";
  readonly description =
    "Display a toast notification to the user with a title and message.";
  readonly parametersSchema = ShowToastParamsSchema;

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const parseResult = ShowToastParamsSchema.safeParse(args);

    if (!parseResult.success) {
      return {
        success: false,
        output: `Invalid parameters: ${parseResult.error.message}`,
      };
    }

    const { title, message } = parseResult.data;

    try {
      await showToast({ title, message });
      return {
        success: true,
        output: `Toast displayed: "${title}" - "${message}"`,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to show toast: ${String(error)}`,
      };
    }
  }
}
