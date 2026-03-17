import type { ToolInfo } from "@repo/types";
import { getIsPowerModeEnabled } from "../utils/assistant-mode.utils";
import { BaseRepo } from "./base.repo";

export class ToolRepo extends BaseRepo {
  async listToolInfos(): Promise<ToolInfo[]> {
    const tools: ToolInfo[] = [
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
          "End the current conversation and close the assistant. ALWAYS call this after pasting text in.",
        schema: {
          type: "object",
          properties: {},
        },
        scope: "pill",
      },
    ];

    if (getIsPowerModeEnabled()) {
      tools.push({
        id: "run_terminal_command",
        description: "Run terminal command",
        instructions:
          "Execute a shell command in the user's terminal and return the output. Use this for file operations, running scripts, checking system state, or any task that requires shell access.",
        schema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The shell command to execute",
            },
          },
          required: ["command"],
        },
      });
    }

    return tools;
  }
}
