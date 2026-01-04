import { z } from "zod";
import { invoke } from "@tauri-apps/api/core";
import type { ToolResult } from "../types/agent.types";
import { BaseTool } from "./base.tool";

export const GetAccessibilityInfoInputSchema = z.object({});

export const GetAccessibilityInfoOutputSchema = z.object({
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
  screenContext: z
    .string()
    .nullable()
    .describe(
      "Text content gathered from the screen around the focused field for context",
    ),
});

type AccessibilityInfo = {
  cursorPosition: number | null;
  selectionLength: number | null;
  textContent: string | null;
  screenContext: string | null;
};

export class GetAccessibilityInfoTool extends BaseTool<
  typeof GetAccessibilityInfoInputSchema,
  typeof GetAccessibilityInfoOutputSchema
> {
  readonly name = "get_accessibility_info";
  readonly description =
    "Get information about what's on the screen and the currently focused text field, including cursor position, selected text length, and text content.";
  readonly inputSchema = GetAccessibilityInfoInputSchema;
  readonly outputSchema = GetAccessibilityInfoOutputSchema;

  protected async execInternal(
    _args: z.infer<typeof GetAccessibilityInfoInputSchema>,
  ): Promise<ToolResult> {
    console.log("Invoking get_accessibility_info...");
    const info = await invoke<AccessibilityInfo>("get_accessibility_info");
    console.log("Accessibility Info:", info);

    if (
      info.textContent === null &&
      info.cursorPosition === null &&
      info.selectionLength === null
    ) {
      return {
        success: false,
        output: {
          error:
            "Could not get accessibility info. No text field is focused or accessibility permissions may be required.",
        },
      };
    }

    return {
      success: true,
      output: this.parseOutput({
        textContent: info.textContent,
        cursorPosition: info.cursorPosition,
        selectionLength: info.selectionLength,
        screenContext: info.screenContext,
      }),
    };
  }
}
