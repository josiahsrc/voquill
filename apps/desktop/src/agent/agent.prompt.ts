import zodToJsonSchema from "zod-to-json-schema";
import { BaseTool } from "../tools/base.tool";
import type { AgentMessage } from "../types/agent.types";
import {
  DecisionResponseSchema,
  FinalResponseSchema,
} from "../types/agent.types";

export const DECISION_JSON_SCHEMA = zodToJsonSchema(DecisionResponseSchema, {
  name: "DecisionResponse",
  $refStrategy: "none",
});

export const FINAL_RESPONSE_JSON_SCHEMA = zodToJsonSchema(FinalResponseSchema, {
  name: "FinalResponse",
  $refStrategy: "none",
});

export const buildDecisionSystemPrompt = (tools: BaseTool[]): string => {
  const toolNames = tools.map((t) => t.name);
  const toolDescriptions = tools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n");

  return `You are a helpful assistant that decides how to respond to user requests.

For all tasks, you should call the accessibility information to try and gather if they
are working on a text field. If they are working on a text field, that means that they
probably want you to edit it, and you should make changes there. If they're not dealing
with a text field, then feel free to respond in any other format you wish. Make sure
to use the tools available to you to gather information before fulfilling the request.

Do your best to write the outputs back into the text field when you have the answer.

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
- Use "respond" when you have completed the user's request or when no tool is needed
- Use "respond" if the user just wants information or a conversational reply
- Choose a tool when you need to take an action to fulfill the request
- If the user's task is not yet complete and a tool can help, choose that tool
- If no tool can satisfy the request, use "respond" to explain what you can do`;
};

export const buildFinalResponseSystemPrompt = (reasoning: string): string => {
  return `You are a helpful assistant that summarizes actions and responds to the user.

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

export const buildToolArgsSystemPrompt = (tool: BaseTool, reasoning: string): string => {
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
