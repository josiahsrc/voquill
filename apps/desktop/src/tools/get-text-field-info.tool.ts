import { z } from "zod";
import { invoke } from "@tauri-apps/api/core";
import type { ToolResult } from "../types/agent.types";
import { BaseTool } from "./base.tool";

export const GetTextFieldInfoInputSchema = z.object({});

export const GetTextFieldInfoOutputSchema = z.object({
  textContent: z
    .string()
    .nullable()
    .describe("The text content of the focused field"),
  cursorPosition: z
    .number()
    .nullable()
    .describe("The cursor position in the text field"),
  selectionLength: z
    .number()
    .nullable()
    .describe("The length of selected text, if any"),
});

type TextFieldInfo = {
  cursorPosition: number | null;
  selectionLength: number | null;
  textContent: string | null;
};

export class GetTextFieldInfoTool extends BaseTool<
  typeof GetTextFieldInfoInputSchema,
  typeof GetTextFieldInfoOutputSchema
> {
  readonly name = "get_text_field_info";
  readonly description =
    "Get information about the currently focused text field, including cursor position, selected text length, and text content.";
  readonly inputSchema = GetTextFieldInfoInputSchema;
  readonly outputSchema = GetTextFieldInfoOutputSchema;

  protected async execInternal(
    _args: z.infer<typeof GetTextFieldInfoInputSchema>,
  ): Promise<ToolResult> {
    console.log("Invoking get_text_field_info...");
    const info = await invoke<TextFieldInfo>("get_text_field_info");
    console.log("Text Field Info:", info);

    if (
      info.textContent === null &&
      info.cursorPosition === null &&
      info.selectionLength === null
    ) {
      return {
        success: false,
        output: {
          error:
            "Could not get text field info. No text field is focused or accessibility permissions may be required.",
        },
      };
    }

    return {
      success: true,
      output: this.parseOutput({
        textContent: info.textContent,
        cursorPosition: info.cursorPosition,
        selectionLength: info.selectionLength,
      }),
    };
  }
}
