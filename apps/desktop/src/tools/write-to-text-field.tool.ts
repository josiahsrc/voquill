import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import type { ToolResult } from "../types/agent.types";
import { BaseTool } from "./base.tool";
import { StopTool } from "./stop.tool";

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
  readonly displayName = "Write to Text Field";
  readonly description =
    "Pastes text into the currently focused text field. Only call this AFTER the user has approved the draft.";
  readonly inputSchema = WriteToTextFieldInputSchema;
  readonly outputSchema = WriteToTextFieldOutputSchema;

  private pasteKeybind: string | null = null;
  private stopTool: StopTool | null = null;

  setPasteKeybind(keybind: string | null): void {
    this.pasteKeybind = keybind;
  }

  setStopTool(stopTool: StopTool): void {
    this.stopTool = stopTool;
  }

  protected async execInternal(
    args: z.infer<typeof WriteToTextFieldInputSchema>,
  ): Promise<ToolResult> {
    const { text } = args;
    await invoke("paste", { text, keybind: this.pasteKeybind });
    this.stopTool?.stop();
    return {
      success: true,
      output: this.parseOutput({ written: true, text }),
    };
  }
}
