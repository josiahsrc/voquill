import type { ToolInfo } from "@repo/types";
import { BaseRepo } from "./base.repo";

export class ToolRepo extends BaseRepo {
  async listToolInfos(): Promise<ToolInfo[]> {
    return [
      {
        id: "paste",
        description: "Paste text into the currently focused text field",
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
        description:
          "Get accessibility information about the currently focused UI element, including text field content, cursor position, selection, and surrounding screen context",
        schema: {
          type: "object",
          properties: {},
        },
      },
      {
        id: "end_conversation",
        description:
          "End the current conversation and close the assistant. ALWAYS use this when your primary task is complete.",
        schema: {
          type: "object",
          properties: {},
        },
        scope: "pill",
      },
    ];
  }
}
