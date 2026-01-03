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

      if (llmResponse.type === "final_answer") {
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

      userInput = `Previous action: Called ${toolCall.name}
Result: ${toolResult.output}

What would you like to do next? (Respond with JSON)`;
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
        description: "Agent response - either a tool call or final answer",
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
        type: "final_answer",
        answer: output.text,
      };
    }
  }

  private normalizeResponse(parsed: unknown): unknown {
    if (typeof parsed !== "object" || parsed === null) {
      return parsed;
    }

    const obj = parsed as Record<string, unknown>;

    if (obj.type === "tool_calls" || obj.type === "tool_call") {
      const toolCall = obj.toolCall ?? obj.tool_call;
      const toolCalls = obj.toolCalls ?? obj.tool_calls;

      const resolvedToolCall = Array.isArray(toolCalls)
        ? toolCalls[0]
        : toolCall;

      if (resolvedToolCall) {
        return {
          type: "tool_call",
          toolCall: resolvedToolCall,
        };
      }
    }

    if (
      obj.type === "final_answer" ||
      obj.type === "response" ||
      obj.type === "answer"
    ) {
      const answer =
        obj.answer ?? obj.response ?? obj.text ?? obj.content ?? obj.message;
      if (typeof answer === "string") {
        return {
          type: "final_answer",
          answer,
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
