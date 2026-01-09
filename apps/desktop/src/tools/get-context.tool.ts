import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import type { ToolResult } from "../types/agent.types";
import { BaseTool } from "./base.tool";

export const GetContextInputSchema = z.object({});

export const GetContextOutputSchema = z.object({
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

type TextFieldInfo = {
  cursorPosition: number | null;
  selectionLength: number | null;
  textContent: string | null;
};

type ScreenContextInfo = {
  screenContext: string | null;
};

export class GetContextTool extends BaseTool<
  typeof GetContextInputSchema,
  typeof GetContextOutputSchema
> {
  readonly name = "get_context";
  readonly displayName = "Get Context";
  readonly description =
    "Get the text field content and surrounding screen context. ALWAYS call this first when the user asks you to write, reply, or respond to something - you need to see what they're looking at. Also use it when you need to understand the user's current context.";
  readonly inputSchema = GetContextInputSchema;
  readonly outputSchema = GetContextOutputSchema;

  protected async execInternal(
    _args: z.infer<typeof GetContextInputSchema>,
  ): Promise<ToolResult> {
    console.log("Invoking get_text_field_info and get_screen_context...");

    const [textFieldInfo, screenContextInfo] = await Promise.all([
      invoke<TextFieldInfo>("get_text_field_info"),
      invoke<ScreenContextInfo>("get_screen_context"),
    ]);

    console.log("Text Field Info:", textFieldInfo);
    console.log("Screen Context Info:", screenContextInfo);

    const hasTextFieldInfo =
      textFieldInfo.textContent !== null ||
      textFieldInfo.cursorPosition !== null ||
      textFieldInfo.selectionLength !== null;
    const hasScreenContext = screenContextInfo.screenContext !== null;

    if (!hasTextFieldInfo && !hasScreenContext) {
      return {
        success: false,
        output: {
          error:
            "Could not get context. No text field is focused and no screen context is available. Accessibility permissions may be required.",
        },
      };
    }

    return {
      success: true,
      output: this.parseOutput({
        textContent: textFieldInfo.textContent,
        cursorPosition: textFieldInfo.cursorPosition,
        selectionLength: textFieldInfo.selectionLength,
        screenContext: screenContextInfo.screenContext,
      }),
    };
  }
}
