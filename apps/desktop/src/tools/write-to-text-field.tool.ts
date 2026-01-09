import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import type { ToolResult } from "../types/agent.types";
import { BaseTool } from "./base.tool";
import type { DraftTool } from "./draft.tool";
import { StopTool } from "./stop.tool";

export const WriteToTextFieldInputSchema = z.object({});

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
    "Pastes the current draft into the focused text field. Requires a draft to be stored first via the draft tool. Only call this after the user explicitly approves the draft (e.g., 'yes', 'looks good', 'send it', 'perfect', 'do it'). If the user requests changes, call the draft tool again with the revised text instead.";
  readonly inputSchema = WriteToTextFieldInputSchema;
  readonly outputSchema = WriteToTextFieldOutputSchema;

  private pasteKeybind: string | null = null;
  private stopTool: StopTool | null = null;
  private draftTool: DraftTool | null = null;

  setPasteKeybind(keybind: string | null): void {
    this.pasteKeybind = keybind;
  }

  setStopTool(stopTool: StopTool): void {
    this.stopTool = stopTool;
  }

  setDraftTool(draftTool: DraftTool): void {
    this.draftTool = draftTool;
  }

  protected async execInternal(
    _args: z.infer<typeof WriteToTextFieldInputSchema>,
  ): Promise<ToolResult> {
    if (!this.draftTool) {
      return {
        success: false,
        output: {
          error: "Internal error: Draft tool not configured.",
        },
      };
    }

    const draft = this.draftTool.getDraft();
    if (draft === null) {
      return {
        success: false,
        output: {
          error:
            "Unable to write text, you must write a draft first using the draft tool.",
        },
      };
    }

    await invoke("paste", { text: draft, keybind: this.pasteKeybind });
    this.draftTool.clearDraft();
    this.stopTool?.stop();

    return {
      success: true,
      output: this.parseOutput({ written: true, text: draft }),
    };
  }
}
