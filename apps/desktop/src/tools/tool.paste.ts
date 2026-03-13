import { invoke } from "@tauri-apps/api/core";
import type { ToolInfo } from "@repo/types";
import { BaseTool } from "./tool.base";

export class PasteTool extends BaseTool {
  constructor(info: ToolInfo) {
    super(info);
  }

  async execute(params: Record<string, unknown>): Promise<void> {
    await invoke("paste", { text: params.text, keybind: null });
  }
}
