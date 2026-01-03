import type { ToolResult } from "../types/agent.types";
import { StopParamsSchema } from "../types/tool.types";
import { BaseTool } from "./base.tool";

export class StopTool extends BaseTool {
  private callback: () => void;

  readonly name = "stop";
  readonly description =
    "Signal that you are done with the conversation and the agent session should end. Use this when the user says goodbye, asks to stop, or when the task is complete and no further interaction is needed.";
  readonly parametersSchema = StopParamsSchema;

  constructor(callback: () => void) {
    super();
    this.callback = callback;
  }

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const parseResult = StopParamsSchema.safeParse(args);

    if (!parseResult.success) {
      return {
        success: false,
        output: `Invalid parameters: ${parseResult.error.message}`,
      };
    }

    const { reason } = parseResult.data;
    this.callback();

    return {
      success: true,
      output: `Session ended: ${reason}`,
    };
  }
}
