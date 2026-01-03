import { z } from "zod";

export const DecisionResponseSchema = z.object({
  reasoning: z.string(),
  choice: z.string(),
});
export type DecisionResponse = z.infer<typeof DecisionResponseSchema>;

export const FinalResponseSchema = z.object({
  response: z.string(),
});
export type FinalResponse = z.infer<typeof FinalResponseSchema>;

export const ToolResultSchema = z.object({
  success: z.boolean(),
  output: z.record(z.unknown()),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

export type ToolExecution = {
  name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
};

export type UserMessage = {
  type: "user";
  content: string;
};

export type AssistantMessage = {
  type: "assistant";
  tools: ToolExecution[];
  response: string;
  isError: boolean;
};

export type AgentMessage = UserMessage | AssistantMessage;

export type AgentRunResult = {
  response: string;
  isError: boolean;
  history: AgentMessage[];
};
