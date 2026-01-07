import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import type { ToolResult } from "../types/agent.types";
import { BaseTool } from "./base.tool";

export const GetScreenContextInputSchema = z.object({});

export const GetScreenContextOutputSchema = z.object({
  screenContext: z
    .string()
    .nullable()
    .describe(
      "Text content gathered from the screen around the focused field for context",
    ),
});

type ScreenContextInfo = {
  screenContext: string | null;
};

export class GetScreenContextTool extends BaseTool<
  typeof GetScreenContextInputSchema,
  typeof GetScreenContextOutputSchema
> {
  readonly name = "get_screen_context";
  readonly description =
    "Collect context for what information is visible on the screen. This isn't always accurate, but can provide useful information.";
  readonly inputSchema = GetScreenContextInputSchema;
  readonly outputSchema = GetScreenContextOutputSchema;

  protected async execInternal(
    _args: z.infer<typeof GetScreenContextInputSchema>,
  ): Promise<ToolResult> {
    console.log("Invoking get_screen_context...");
    const info = await invoke<ScreenContextInfo>("get_screen_context");
    console.log("Screen Context Info:", info);

    if (info.screenContext === null) {
      return {
        success: false,
        output: {
          error:
            "Could not get screen context. Accessibility permissions may be required or no context is available.",
        },
      };
    }

    return {
      success: true,
      output: this.parseOutput({
        screenContext: info.screenContext,
      }),
    };
  }
}
