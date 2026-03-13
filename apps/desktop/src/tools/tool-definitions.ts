import type { ToolInfo } from "@repo/types";

export interface TauriToolStrategy {
  type: "tauri";
  command: string;
}

export type ToolStrategy = TauriToolStrategy;

export interface ToolDefinition {
  info: ToolInfo;
  strategy: ToolStrategy;
  autoApprove: boolean;
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    info: {
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
    strategy: { type: "tauri", command: "paste" },
    autoApprove: true,
  },
];

const definitionMap = new Map(TOOL_DEFINITIONS.map((d) => [d.info.id, d]));

export function getToolInfoList(): ToolInfo[] {
  return TOOL_DEFINITIONS.map((d) => d.info);
}

export function getToolDefinition(id: string): ToolDefinition | undefined {
  return definitionMap.get(id);
}
