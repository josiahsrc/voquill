import type { BaseGenerateTextRepo } from "../repos/generate-text.repo";
import { BaseTool } from "../tools/base.tool";
import {
  DECISION_JSON_SCHEMA,
  FINAL_RESPONSE_JSON_SCHEMA,
  buildDecisionSystemPrompt,
  buildFinalResponseSystemPrompt,
  buildToolArgsSystemPrompt,
  buildUserPrompt,
} from "./agent.prompt";
import type {
  AgentMessage,
  AgentRunResult,
  DecisionResponse,
  FinalResponse,
  ToolExecution,
  ToolResult,
} from "../types/agent.types";
import {
  DecisionResponseSchema,
  FinalResponseSchema,
} from "../types/agent.types";

const MAX_ITERATIONS = 16;

export class Agent {
  private history: AgentMessage[] = [];

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

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const userPrompt = buildUserPrompt(this.history, userInput);
      const decision = await this.callDecisionLLM(
        decisionSystemPrompt,
        userPrompt,
      );

      if (decision.choice === "respond") {
        const response = await this.callFinalResponseLLM(userPrompt);
        this.history.push({
          type: "assistant",
          tools: toolExecutions,
          response,
        });
        return { response, history: this.getHistory() };
      }

      const tool = this.toolRecord()[decision.choice];
      if (!tool) {
        const response = `I tried to use tool "${decision.choice}" but it doesn't exist. Available tools: ${Object.keys(this.toolRecord()).join(", ")}`;
        this.history.push({
          type: "assistant",
          tools: toolExecutions,
          response,
        });
        return { response, history: this.getHistory() };
      }

      const toolArgs = await this.callToolArgsLLM(tool, userPrompt);
      const toolResult = await this.executeTool(tool, toolArgs);

      toolExecutions.push({
        name: tool.name,
        input: toolArgs,
        output: toolResult.output,
      });

      userInput = `Tool "${tool.name}" executed with args ${JSON.stringify(toolArgs)}.
Result: ${JSON.stringify(toolResult.output)}
${toolResult.success ? "Success." : "Failed."}

Decide what to do next. If the user's original request is complete, choose "respond".`;
    }

    const response =
      "I apologize, but I was unable to complete the task in the allowed number of steps.";
    this.history.push({
      type: "assistant",
      tools: toolExecutions,
      response,
    });
    return { response, history: this.getHistory() };
  }

  private async callDecisionLLM(
    system: string,
    prompt: string,
  ): Promise<DecisionResponse> {
    const output = await this.repo.generateText({
      system,
      prompt,
      jsonResponse: {
        name: "decision_response",
        description: "Decision about what action to take",
        schema: DECISION_JSON_SCHEMA,
      },
    });

    try {
      const parsed = JSON.parse(output.text);
      return DecisionResponseSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse decision response:", error, output.text);
      return { reasoning: "Failed to parse response", choice: "respond" };
    }
  }

  private async callFinalResponseLLM(prompt: string): Promise<string> {
    const system = buildFinalResponseSystemPrompt();
    const output = await this.repo.generateText({
      system,
      prompt,
      jsonResponse: {
        name: "final_response",
        description: "Final response to the user",
        schema: FINAL_RESPONSE_JSON_SCHEMA,
      },
    });

    try {
      const parsed: FinalResponse = JSON.parse(output.text);
      return FinalResponseSchema.parse(parsed).response;
    } catch (error) {
      console.error("Failed to parse final response:", error, output.text);
      return output.text;
    }
  }

  private async callToolArgsLLM(
    tool: BaseTool,
    prompt: string,
  ): Promise<Record<string, unknown>> {
    const system = buildToolArgsSystemPrompt(tool);
    const output = await this.repo.generateText({
      system,
      prompt,
      jsonResponse: {
        name: "tool_args",
        description: `Arguments for the ${tool.name} tool`,
        schema: tool.getInputJsonSchema(),
      },
    });

    try {
      return JSON.parse(output.text);
    } catch (error) {
      console.error("Failed to parse tool args:", error, output.text);
      return {};
    }
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
