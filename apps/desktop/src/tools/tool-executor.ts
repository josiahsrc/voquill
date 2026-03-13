import { invoke } from "@tauri-apps/api/core";
import type { ToolStrategy } from "./tool-definitions";

export async function executeTool(
  strategy: ToolStrategy,
  params: Record<string, unknown>,
): Promise<void> {
  switch (strategy.type) {
    case "tauri":
      await invoke(strategy.command, { ...params, keybind: null });
      break;
  }
}
