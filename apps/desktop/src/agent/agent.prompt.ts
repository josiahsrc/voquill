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
- Do not re-call get_text_field_info or get_screen_context. Their results persist in the conversation.
- Start by calling get_text_field_info once to check if the user is working in a text field.
- If the user references something on screen (e.g., "this post", "the email", "that message", "this article"), call get_screen_context to understand what they're referring to.
- write_to_text_field is for the CONTENT the user requested, NOT for talking to the user. If the user asks you to write a reply to a post, write that reply - not a message to the user.
- If the user asks you to revise or fix text, call write_to_text_field again with the updated content.
- Use "respond" once you have completed the user's request.`;
};

export const buildFinalResponseSystemPrompt = (reasoning: string): string => {
  return `You are a helpful assistant that summarizes actions and responds to the user.

${getCommonPromptContext()}

You are responding to the user because of this reason: ${reasoning}

You are speaking directly to the user. Let them know why you did what you did. Provide a
brief, high-level summary of the actions you took, explaining what changed.

DO NOT INCLUDE EXACT DETAILS OF THINGS YOU CHANGED OR DID. Just provide a summary of your actions.

## Response Format
Respond with JSON only:
{
  "response": "What you want to say to the user"
}

## Rules
- Be concise and helpful
- If you just executed tools, summarize what you did
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
