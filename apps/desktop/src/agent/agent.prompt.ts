import zodToJsonSchema from "zod-to-json-schema";
import { BaseTool } from "../tools/base.tool";
import type { AgentMessage } from "../types/agent.types";
import { AgentLLMResponseSchema } from "../types/agent.types";

export const AGENT_RESPONSE_JSON_SCHEMA =
  (zodToJsonSchema(AgentLLMResponseSchema, "AgentResponse").definitions
    ?.AgentResponse as Record<string, unknown>) ?? {};

export const buildSystemPrompt = (tools: BaseTool[]): string => {
  const toolDescriptions = tools.map((t) => t.toPromptString()).join("\n\n");

  return `You are a helpful AI assistant in Voquill, a voice-to-text application. You help users by calling tools when needed.

## Available Tools
${toolDescriptions}

## Response Format
You MUST respond with ONLY valid JSON (no markdown, no explanation). Return either a tool call or an answer.

## Rules
- ALWAYS respond with valid JSON only - no other text
- If the user asks you to do something that requires a tool, call the tool
- After a tool executes, you will receive the result. Then either call another tool or provide an answer
- Use the stop tool when the user wants to end the conversation (says goodbye, stop, etc.)
- Keep calling tools until you have completed the user's request, then provide an answer
- Be concise in your answers`;
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
