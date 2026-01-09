import zodToJsonSchema from "zod-to-json-schema";
import { getAppState } from "../store";
import { BaseTool } from "../tools/base.tool";
import type { AgentMessage } from "../types/agent.types";
import {
  DecisionResponseSchema,
  FinalResponseSchema,
} from "../types/agent.types";
import { getMyUserName } from "../utils/user.utils";

export const DECISION_JSON_SCHEMA = zodToJsonSchema(DecisionResponseSchema, {
  name: "DecisionResponse",
  $refStrategy: "none",
});

export const FINAL_RESPONSE_JSON_SCHEMA = zodToJsonSchema(FinalResponseSchema, {
  name: "FinalResponse",
  $refStrategy: "none",
});

const getCommonPromptContext = (): string => {
  const username = getMyUserName(getAppState());
  return `
The user's name is "${username}".
`;
};

export const buildDecisionSystemPrompt = (tools: BaseTool[]): string => {
  const toolNames = tools.map((t) => t.name);
  const toolDescriptions = tools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n");

  return `You are a helpful assistant that decides how to respond to user requests.

${getCommonPromptContext()}

## Available Tools
${toolDescriptions}

## Your Task
Analyze the user's request and conversation history, then decide what to do next.

## Response Format
Respond with JSON only:
{
  "reasoning": "Brief explanation of why you chose this action",
  "choice": "respond" | "${toolNames.join('" | "')}"
}

## Rules
- If you're not sure what the user is referring to, use get_text_field_info and get_screen_context to gather more information.

## Draft Approval Flow (CRITICAL)
When the user asks you to write content (emails, replies, messages, etc.):
1. FIRST: Choose "respond" and output the FULL draft text in your response. End with "How does this sound?" or similar.
2. WAIT for the user to confirm (e.g., "yes", "looks good", "send it", "perfect").
3. ONLY THEN: Call write_to_text_field with the approved draft.

REVISION REQUESTS: If the user asks for changes (e.g., "make it shorter", "more formal", "change X to Y"):
- Choose "respond"
- Output the FULL REVISED draft text in your response
- Ask for confirmation again (e.g., "How about this?")
- Do NOT call write_to_text_field yet

APPROVAL: Only call write_to_text_field when the user explicitly approves with phrases like "yes", "good", "perfect", "do it", "send it", "looks good", "that works", etc.

- Use "respond" once you have completed the user's request.`;
};

export const buildFinalResponseSystemPrompt = (reasoning: string): string => {
  return `You are a helpful assistant that responds to the user.

${getCommonPromptContext()}

You are responding to the user because of this reason: ${reasoning}

## Response Format
Respond with JSON only:
{
  "response": "What you want to say to the user"
}

## Rules
- Be concise and helpful
- If you're presenting a draft for approval, include the FULL draft text and ask for confirmation
- If you're revising a draft, include the FULL REVISED draft text and ask for confirmation
- If you just executed a tool (like write_to_text_field), briefly confirm what you did
- If you're answering a question, provide the answer directly
`;
};

export const buildToolArgsSystemPrompt = (
  tool: BaseTool,
  reasoning: string,
): string => {
  const jsonSchema = tool.getInputJsonSchema();

  return `You are a helpful assistant. You need to provide arguments for the "${tool.name}" tool.

The reason for calling this tool is: ${reasoning}

## Tool Description
${tool.description}

## Parameters Schema
${JSON.stringify(jsonSchema, null, 2)}

## Response Format
Respond with JSON matching the parameters schema above.

## Rules
- Provide all required parameters
- Use appropriate values based on the conversation context`;
};

export const formatHistory = (messages: AgentMessage[]): string => {
  return messages
    .map((msg) => {
      if (msg.type === "user") {
        return `User: ${msg.content}`;
      }
      const toolsSummary =
        msg.tools.length > 0
          ? `[Tools used: ${msg.tools.map((t) => `${t.name}(${JSON.stringify(t.input)}) → ${JSON.stringify(t.output)}`).join(", ")}]\n`
          : "";
      return `Assistant: ${toolsSummary}${msg.response}`;
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
${currentInput}`;
};
