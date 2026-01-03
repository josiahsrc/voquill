import { z } from "zod";
import { TypedToolCallSchema } from "./tool.types";

export const AgentMessageSchema = z.object({
  role: z.enum(["user", "assistant", "tool"]),
  content: z.string(),
  toolName: z.string().optional(),
});
export type AgentMessage = z.infer<typeof AgentMessageSchema>;

export const ToolCallSchema = TypedToolCallSchema;
export type ToolCall = z.infer<typeof ToolCallSchema>;

export const AgentLLMResponseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("tool_call"), toolCall: TypedToolCallSchema }),
  z.object({ type: z.literal("answer"), answer: z.string() }),
]);
export type AgentLLMResponse = z.infer<typeof AgentLLMResponseSchema>;

export const ToolResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

export type AgentRunResult = {
  response: string;
  toolCalls: ToolCall[];
};
