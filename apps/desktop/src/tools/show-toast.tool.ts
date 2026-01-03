import { z } from "zod";
import { showToast } from "../actions/toast.actions";
import type { ToolResult } from "../types/agent.types";
import { BaseTool } from "./base.tool";

export const ShowToastInputSchema = z.object({
  title: z.string().describe("The title of the toast notification"),
  message: z.string().describe("The message body of the toast notification"),
});

export const ShowToastOutputSchema = z.object({
  displayed: z.boolean().describe("Whether the toast was displayed"),
  title: z.string().describe("The title that was displayed"),
  message: z.string().describe("The message that was displayed"),
});

export class ShowToastTool extends BaseTool<
  typeof ShowToastInputSchema,
  typeof ShowToastOutputSchema
> {
  readonly name = "show_toast";
  readonly description =
    "Display a toast notification to the user with a title and message.";
  readonly inputSchema = ShowToastInputSchema;
  readonly outputSchema = ShowToastOutputSchema;

  protected async execInternal(
    args: z.infer<typeof ShowToastInputSchema>,
  ): Promise<ToolResult> {
    const { title, message } = args;
    await showToast({ title, message });
    return {
      success: true,
      output: this.parseOutput({ displayed: true, title, message }),
    };
  }
}
