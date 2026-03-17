import type { ToolInfo } from "@repo/types";
import { getAppState } from "../store";

export type AgentTypeConfig = {
  agentType: string;
  systemPrompt: string;
  getToolFilter: (conversationId: string) => (info: ToolInfo) => boolean;
  maxIterations: number;
};

export const CHAT_AGENT_CONFIG: AgentTypeConfig = {
  agentType: "chat",
  systemPrompt: [
    "You are a helpful assistant running on the user's desktop with access to tools.",
    "Use the available tools when needed to help the user.",
    "When the user refers to something on their screen, read the context using your tools — don't ask them to paste it.",
    "After completing a task, deliver the result using the appropriate tool (e.g. paste text into their field) and respond concisely.",
    "Iteratively solve larger tasks, break them down into smaller steps and use your tools to complete each step, delivering results as you go.",
  ].join(" "),
  getToolFilter: (conversationId) => {
    const isPill = getAppState().pillConversationId === conversationId;
    return (t) => (isPill ? t.scope !== "chat" : t.scope !== "pill");
  },
  maxIterations: 20,
};
