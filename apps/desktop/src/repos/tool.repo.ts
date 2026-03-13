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
    ];
  }
}
