import { z } from "zod";
import type { ToolResult } from "../types/agent.types";
import { BaseTool } from "./base.tool";

export const DraftInputSchema = z.object({
  text: z.string().describe("The draft text to store"),
});

export const DraftOutputSchema = z.object({
  stored: z.boolean().describe("Whether the draft was stored successfully"),
  text: z.string().describe("The draft text that was stored"),
});

export class DraftTool extends BaseTool<
  typeof DraftInputSchema,
  typeof DraftOutputSchema
> {
  readonly name = "draft";
  readonly displayName = "Draft";
  readonly description =
    "Store a draft of the text you want to write. The draft will be shown to the user separately for review. After calling this tool, respond to ask for the user's approval (e.g., 'How does this sound?'). Do NOT repeat the draft text in your response - it is displayed automatically. You must call this before write_to_text_field can be used.";
  readonly inputSchema = DraftInputSchema;
  readonly outputSchema = DraftOutputSchema;

  private draft: string | null = null;
  private onDraftUpdated: ((draft: string) => void) | null = null;

  setOnDraftUpdated(callback: (draft: string) => void): void {
    this.onDraftUpdated = callback;
  }

  getDraft(): string | null {
    return this.draft;
  }

  clearDraft(): void {
    this.draft = null;
  }

  protected async execInternal(
    args: z.infer<typeof DraftInputSchema>,
  ): Promise<ToolResult> {
    const { text } = args;
    this.draft = text;

    if (this.onDraftUpdated) {
      this.onDraftUpdated(text);
    }

    return {
      success: true,
      output: this.parseOutput({ stored: true, text }),
    };
  }
}
