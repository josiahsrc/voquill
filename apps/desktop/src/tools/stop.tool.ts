import { z } from "zod";
import type { ToolResult } from "../types/agent.types";
import { BaseTool } from "./base.tool";

export const StopInputSchema = z.object({
  reason: z
    .string()
    .describe("Brief explanation for why the session is ending"),
});

export const StopOutputSchema = z.object({
  stopped: z.boolean().describe("Whether the session was stopped"),
  reason: z.string().describe("The reason the session was stopped"),
});

export class StopTool extends BaseTool<
  typeof StopInputSchema,
  typeof StopOutputSchema
> {
  private callback: () => void;

  readonly name = "stop";
  readonly description =
    "Signal that you are done with the conversation and the agent session should end. Use this when the user says goodbye, asks to stop, or when the task is complete and no further interaction is needed.";
  readonly inputSchema = StopInputSchema;
  readonly outputSchema = StopOutputSchema;

  constructor(callback: () => void) {
    super();
    this.callback = callback;
  }

  protected async execInternal(
    args: z.infer<typeof StopInputSchema>,
  ): Promise<ToolResult> {
    const { reason } = args;
    this.callback();
    return {
      success: true,
      output: this.parseOutput({ stopped: true, reason }),
    };
  }
}
