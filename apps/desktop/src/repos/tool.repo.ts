import type { ToolInfo } from "@repo/types";
import { BaseRepo } from "./base.repo";

export class ToolRepo extends BaseRepo {
  async listToolInfos(): Promise<ToolInfo[]> {
    return [
      {
        id: "paste",
        description: "Paste text",
        instructions:
          "Paste text into the currently focused text field on the user's screen",
        schema: {
          type: "object",
          properties: {
            text: { type: "string", description: "The text to paste" },
          },
          required: ["text"],
        },
      },
      {
        id: "get_accessibility_info",
        description: "Read screen context",
        instructions:
          "Get accessibility information about the currently focused UI element, including text field content, cursor position, selection, and surrounding screen context. Use this to understand what the user is looking at before taking action.",
        schema: {
          type: "object",
          properties: {},
        },
      },
      {
        id: "end_conversation",
        description: "End conversation",
        instructions:
          "End the current conversation and close the assistant. ALWAYS call this when your primary task is complete.",
        schema: {
          type: "object",
          properties: {},
        },
        scope: "pill",
      },
    ];
  }
}
