import { retry } from "@repo/utilities";
import type { ZodType, z } from "zod";
import type {
  BaseGenerateTextRepo,
  GenerateTextInput,
} from "../repos/generate-text.repo";
import { BaseTool } from "../tools/base.tool";
import type {
  AgentMessage,
  AgentRunResult,
  DecisionResponse,
  ToolExecution,
  ToolResult,
} from "../types/agent.types";
import {
  DecisionResponseSchema,
  FinalResponseSchema,
} from "../types/agent.types";
import {
  DECISION_JSON_SCHEMA,
  FINAL_RESPONSE_JSON_SCHEMA,
  buildDecisionSystemPrompt,
  buildFinalResponseSystemPrompt,
  buildToolArgsSystemPrompt,
  buildUserPrompt,
} from "./agent.prompt";

const MAX_ITERATIONS = 16;
const LLM_RETRIES = 3;
const LLM_RETRY_DELAY_MS = 500;

export class Agent {
  private history: AgentMessage[] = [];

  constructor(
    private repo: BaseGenerateTextRepo,
    private tools: BaseTool[] = [],
  ) {}

  private generateTextWithRetries<T extends ZodType>(
    schema: T,
    input: GenerateTextInput,
  ): Promise<z.infer<T>> {
    return retry({
      fn: async () => {
        const output = await this.repo.generateText(input);
        const parsed = JSON.parse(output.text);
        return schema.parse(parsed);
      },
      retries: LLM_RETRIES,
      delay: LLM_RETRY_DELAY_MS,
    });
  }

  private toolRecord(): Record<string, BaseTool> {
    const record: Record<string, BaseTool> = {};
    for (const tool of this.tools) {
      record[tool.name] = tool;
    }
    return record;
  }

  getHistory(): AgentMessage[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  async run(userInput: string): Promise<AgentRunResult> {
    this.history.push({ type: "user", content: userInput });

    const toolExecutions: ToolExecution[] = [];
    const decisionSystemPrompt = buildDecisionSystemPrompt(this.tools);

    try {
      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const userPrompt = buildUserPrompt(this.history, userInput);
        const decision = await this.callDecisionLLM(
          decisionSystemPrompt,
          userPrompt,
        );

        if (decision.choice === "respond") {
          const response = await this.callFinalResponseLLM(
            userPrompt,
            decision.reasoning,
          );
          this.history.push({
            type: "assistant",
            tools: toolExecutions,
            response,
            isError: false,
          });
          return { response, history: this.getHistory(), isError: false };
        }

        const tool = this.toolRecord()[decision.choice];
        if (!tool) {
          throw new Error(`Tool not found: ${decision.choice}`);
        }

        const toolArgs = await this.callToolArgsLLM(
          tool,
          userPrompt,
          decision.reasoning,
        );

        const toolResult = await this.executeTool(tool, toolArgs);

        toolExecutions.push({
          name: tool.name,
          displayName: tool.displayName,
          input: toolArgs,
          output: toolResult.output,
        });

        userInput = `Tool "${tool.name}" executed with args ${JSON.stringify(toolArgs)}.
Result: ${JSON.stringify(toolResult.output)}
${toolResult.success ? "Success." : "Failed."}

Decide what to do next. If the user's original request is complete, choose "respond".`;
      }

      throw new Error(
        "Maximum iterations reached without completing the task.",
      );
    } catch (error) {
      let message: string;
      if (error instanceof Error) {
        message = error.message;
      } else {
        message = "An unexpected error occurred.";
      }

      this.history.push({
        type: "assistant",
        tools: toolExecutions,
        response: message,
        isError: true,
      });

      return { response: message, history: this.getHistory(), isError: true };
    }
  }

  private async callDecisionLLM(
    system: string,
    prompt: string,
  ): Promise<DecisionResponse> {
    return this.generateTextWithRetries(DecisionResponseSchema, {
      system,
      prompt,
      jsonResponse: {
        name: "decision_response",
        description: "Decision about what action to take",
        schema: DECISION_JSON_SCHEMA,
      },
    });
  }

  private async callFinalResponseLLM(
    prompt: string,
    reasoning: string,
  ): Promise<string> {
    const system = buildFinalResponseSystemPrompt(reasoning);
    const result = await this.generateTextWithRetries(FinalResponseSchema, {
      system,
      prompt,
      jsonResponse: {
        name: "final_response",
        description: "Final response to the user",
        schema: FINAL_RESPONSE_JSON_SCHEMA,
      },
    });
    return result.response;
  }

  private async callToolArgsLLM(
    tool: BaseTool,
    prompt: string,
    reasoning: string,
  ): Promise<Record<string, unknown>> {
    const system = buildToolArgsSystemPrompt(tool, reasoning);
    return this.generateTextWithRetries(tool.inputSchema, {
      system,
      prompt,
      jsonResponse: {
        name: "tool_args",
        description: `Arguments for the ${tool.name} tool`,
        schema: tool.getInputJsonSchema(),
      },
    });
  }

  private async executeTool(
    tool: BaseTool,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    try {
      return await tool.execute(args);
    } catch (error) {
      return {
        success: false,
        output: { error: `Tool execution error: ${String(error)}` },
      };
    }
  }
}
