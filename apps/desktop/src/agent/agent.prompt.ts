import zodToJsonSchema from "zod-to-json-schema";
import { BaseTool } from "../tools/base.tool";
import type { AgentMessage } from "../types/agent.types";
import { AgentLLMResponseSchema } from "../types/agent.types";

export const AGENT_RESPONSE_JSON_SCHEMA = zodToJsonSchema(
  AgentLLMResponseSchema,
  {
    name: "AgentResponse",
    // Inline all definitions for better LLM comprehension
    $refStrategy: "none",
  },
);

export const buildSystemPrompt = (tools: BaseTool[]): string => {
  const toolDescriptions = tools.map((t) => t.toPromptString()).join("\n\n");

  return `You are a helpful assistant. Respond with JSON only.

## Tools
${toolDescriptions}

## Response Format
Respond with exactly ONE of these JSON formats:

To call a tool:
{"type": "tool_call", "toolCall": {"name": "tool_name", "arguments": {...}}}

To answer the user:
{"type": "answer", "answer": "your response"}

## Rules
- Output valid JSON only. No other text.
- Call ONE tool at a time. Never multiple.
- After a tool runs, respond with an answer confirming what happened.`;
};

export const formatHistory = (messages: AgentMessage[]): string => {
  return messages
    .map((msg) => {
      switch (msg.role) {
        case "user":
          return `User: ${msg.content}`;
        case "assistant":
          return `Assistant: ${msg.content}`;
        case "tool":
          return `Tool (${msg.toolName}): ${msg.content}`;
        default:
          return msg.content;
      }
    })
    .join("\n\n");
};

export const buildUserPrompt = (
  history: AgentMessage[],
  currentInput: string,
): string => {
  const historyText =
    history.length > 0
      ? `## Conversation History\n${formatHistory(history)}\n\n`
      : "";

  return `${historyText}## Current User Input
${currentInput}

Respond with JSON (tool_call or answer):`;
};
