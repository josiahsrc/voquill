import type { BaseGenerateTextRepo } from "../repos/generate-text.repo";
import { BaseTool } from "../tools/base.tool";
import {
  AGENT_RESPONSE_JSON_SCHEMA,
  buildSystemPrompt,
  buildUserPrompt,
} from "./agent.prompt";
import type {
  AgentLLMResponse,
  AgentMessage,
  AgentRunResult,
  ToolCall,
  ToolResult,
} from "../types/agent.types";
import { AgentLLMResponseSchema } from "../types/agent.types";

const MAX_ITERATIONS = 10;

export class Agent {
  constructor(
    private repo: BaseGenerateTextRepo,
    private tools: BaseTool[] = [],
  ) {}

  private toolRecord(): Record<string, BaseTool> {
    const record: Record<string, BaseTool> = {};
    for (const tool of this.tools) {
      record[tool.name] = tool;
    }
    return record;
  }

  async run(
    history: AgentMessage[],
    userInput: string,
  ): Promise<AgentRunResult> {
    const toolCalls: ToolCall[] = [];

    const messages: AgentMessage[] = [
      ...history,
      { role: "user", content: userInput },
    ];

    const systemPrompt = buildSystemPrompt(this.tools);

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const userPrompt = buildUserPrompt(messages.slice(0, -1), userInput);

      const llmResponse = await this.callLLM(systemPrompt, userPrompt);

      if (llmResponse.type === "answer") {
        return {
          response: llmResponse.answer,
          toolCalls,
        };
      }

      const { toolCall } = llmResponse;
      toolCalls.push(toolCall);

      const toolResult = await this.executeTool(toolCall);

      messages.push({
        role: "tool",
        content: toolResult.output,
        toolName: toolCall.name,
      });

      userInput = `Tool "${toolCall.name}" executed.
Result: ${toolResult.output}

Now respond with JSON. If the user's original request is complete, provide an {"type": "answer", "answer": "..."} confirming what was done. Only call another tool if more actions are needed.`;
    }

    return {
      response:
        "I apologize, but I was unable to complete the task in the allowed number of steps.",
      toolCalls,
    };
  }

  private async callLLM(
    system: string,
    prompt: string,
  ): Promise<AgentLLMResponse> {
    const output = await this.repo.generateText({
      system,
      prompt,
      jsonResponse: {
        name: "agent_response",
        description: "Agent response - either a tool call or answer",
        schema: AGENT_RESPONSE_JSON_SCHEMA,
      },
    });

    try {
      const parsed = JSON.parse(output.text);
      const normalized = this.normalizeResponse(parsed);
      const validated = AgentLLMResponseSchema.parse(normalized);
      return validated;
    } catch (error) {
      console.error("Failed to parse agent response:", error, output.text);
      return {
        type: "answer",
        answer: output.text,
      };
    }
  }

  private normalizeResponse(parsed: unknown): unknown {
    if (typeof parsed !== "object" || parsed === null) {
      // If the LLM returned a plain string, treat it as an answer
      if (typeof parsed === "string") {
        return { type: "answer", answer: parsed };
      }
      return parsed;
    }

    const obj = parsed as Record<string, unknown>;

    // Handle tool_call responses (various malformed formats LLMs produce)
    if (
      obj.type === "tool_calls" ||
      obj.type === "tool_call" ||
      obj.toolCall ||
      obj.toolCalls ||
      obj.tool_call ||
      obj.tool_calls
    ) {
      // Gather all possible tool call fields
      const candidates = [
        obj.toolCall,
        obj.tool_call,
        obj.toolCalls,
        obj.tool_calls,
      ];

      for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length > 0) {
          // Take only the first tool call from any array
          return { type: "tool_call", toolCall: candidate[0] };
        }
        if (candidate && typeof candidate === "object" && "name" in candidate) {
          // Single tool call object
          return { type: "tool_call", toolCall: candidate };
        }
      }
    }

    // Handle answer responses (various formats)
    if (
      obj.type === "answer" ||
      obj.type === "final_answer" ||
      obj.type === "response"
    ) {
      const answer =
        obj.answer ?? obj.response ?? obj.text ?? obj.content ?? obj.message;
      if (typeof answer === "string") {
        return {
          type: "answer",
          answer,
        };
      }
    }

    // Handle case where LLM returned an object without a type field
    // but has answer-like content
    if (!obj.type) {
      const possibleAnswer =
        obj.answer ?? obj.response ?? obj.text ?? obj.content ?? obj.message;
      if (typeof possibleAnswer === "string") {
        return { type: "answer", answer: possibleAnswer };
      }

      // Check if it looks like a tool call without the wrapper
      if (obj.name && obj.arguments) {
        return {
          type: "tool_call",
          toolCall: { name: obj.name, arguments: obj.arguments },
        };
      }
    }

    return parsed;
  }

  private async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.toolRecord()[toolCall.name];
    if (!tool) {
      return {
        success: false,
        output: `Unknown tool: ${toolCall.name}. Available tools: ${Object.keys(this.toolRecord()).join(", ")}`,
      };
    }

    try {
      return await tool.execute(toolCall.arguments);
    } catch (error) {
      return {
        success: false,
        output: `Tool execution error: ${String(error)}`,
      };
    }
  }
}
