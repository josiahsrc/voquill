import { invoke } from "@tauri-apps/api/core";
import type { ToolInfo } from "@repo/types";
import { BaseTool } from "./base.tool";
import {
  getToolAlwaysAllow,
  setToolAlwaysAllow,
} from "../utils/tool-permission.utils";

export class PasteTool extends BaseTool {
  constructor(info: ToolInfo) {
    super(info);
  }

  async execute(
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    await invoke("paste", { text: params.text, keybind: null });
    return {};
  }

  getAlwaysAllow(): boolean {
    return getToolAlwaysAllow(this.info.id);
  }

  setAlwaysAllow(_params: Record<string, unknown>, allowed: boolean): void {
    setToolAlwaysAllow(this.info.id, allowed);
  }
}
