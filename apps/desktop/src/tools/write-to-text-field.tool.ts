import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import type { ToolResult } from "../types/agent.types";
import { BaseTool } from "./base.tool";

export const WriteToTextFieldInputSchema = z.object({
  text: z.string().describe("The text to write to the focused text field"),
});

export const WriteToTextFieldOutputSchema = z.object({
  written: z.boolean().describe("Whether the text was written successfully"),
  text: z.string().describe("The text that was written"),
});

export class WriteToTextFieldTool extends BaseTool<
  typeof WriteToTextFieldInputSchema,
  typeof WriteToTextFieldOutputSchema
> {
  readonly name = "write_to_text_field";
  readonly description =
    "Replaces the entire content of the currently focused text field with the provided text.";
  readonly inputSchema = WriteToTextFieldInputSchema;
  readonly outputSchema = WriteToTextFieldOutputSchema;

  protected async execInternal(
    args: z.infer<typeof WriteToTextFieldInputSchema>,
  ): Promise<ToolResult> {
    const { text } = args;
    await invoke("set_accessibility_text", { text });
    return {
      success: true,
      output: this.parseOutput({ written: true, text }),
    };
  }
}
