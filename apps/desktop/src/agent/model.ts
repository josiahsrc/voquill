import {
  BaseChatModel,
  type BaseChatModelCallOptions,
  type BindToolsInput,
} from "@langchain/core/language_models/chat_models";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";
import type { Runnable } from "@langchain/core/runnables";
import type { ToolCall } from "@langchain/core/messages/tool";
import { BaseGenerateTextRepo } from "../repos/generate-text.repo";

interface RepoChatCallOptions extends BaseChatModelCallOptions {
  tools?: BindToolsInput[];
}

export class RepoModel extends BaseChatModel<RepoChatCallOptions> {
  private tools: BindToolsInput[] = [];

  constructor(private readonly repo: BaseGenerateTextRepo) {
    super({});
  }

  _llmType(): string {
    return "voquill-repo";
  }

  get identifyingParams() {
    return { model: this.repo.getModelName() };
  }

  bindTools(
    tools: BindToolsInput[],
    _kwargs?: Partial<RepoChatCallOptions>,
  ): Runnable {
    const bound = new RepoModel(this.repo);
    bound.tools = tools;
    return bound;
  }

  private buildToolsPrompt(): string {
    if (this.tools.length === 0) return "";

    const toolDescriptions = this.tools.map((tool) => {
      const t = tool as { name: string; description: string; schema?: unknown };
      return `- ${t.name}: ${t.description}`;
    });

    return `
You have access to the following tools:
${toolDescriptions.join("\n")}

When you need to use a tool, respond with a JSON object in this exact format:
{"tool_calls": [{"name": "tool_name", "args": {...}}]}

When you don't need a tool or have the final answer, respond normally with text.
Do NOT include both a tool call and text in the same response.
`.trim();
  }

  private formatMessages(messages: BaseMessage[]): string {
    return messages
      .map((m) => {
        let role: string;
        if (HumanMessage.isInstance(m)) {
          role = "User";
        } else if (AIMessage.isInstance(m)) {
          role = "Assistant";
        } else if (SystemMessage.isInstance(m)) {
          role = "System";
        } else if (ToolMessage.isInstance(m)) {
          role = "Tool Result";
        } else {
          role = "Unknown";
        }

        const content =
          typeof m.content === "string"
            ? m.content
            : JSON.stringify(m.content);

        // For tool messages, include the tool call id context
        if (ToolMessage.isInstance(m)) {
          return `${role} (${m.tool_call_id}): ${content}`;
        }

        return `${role}: ${content}`;
      })
      .join("\n\n");
  }

  private parseToolCalls(text: string): ToolCall[] | null {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*"tool_calls"[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (
        parsed.tool_calls &&
        Array.isArray(parsed.tool_calls) &&
        parsed.tool_calls.length > 0
      ) {
        return parsed.tool_calls.map(
          (tc: { name: string; args: Record<string, unknown> }, idx: number) => ({
            id: `call_${Date.now()}_${idx}`,
            name: tc.name,
            args: tc.args ?? {},
            type: "tool_call" as const,
          }),
        );
      }
    } catch {
      // Not valid JSON, return null
    }

    return null;
  }

  async _generate(
    messages: BaseMessage[],
    _options: this["ParsedCallOptions"],
  ): Promise<ChatResult> {
    const toolsPrompt = this.buildToolsPrompt();
    const conversationPrompt = this.formatMessages(messages);

    const fullPrompt = toolsPrompt
      ? `${toolsPrompt}\n\n${conversationPrompt}`
      : conversationPrompt;

    const response = await this.repo.generateText({
      prompt: fullPrompt,
    });

    // Try to parse tool calls from the response
    const toolCalls = this.tools.length > 0 ? this.parseToolCalls(response.text) : null;

    const aiMessage = new AIMessage({
      content: toolCalls ? "" : response.text,
      tool_calls: toolCalls ?? undefined,
    });

    return {
      generations: [
        {
          message: aiMessage,
          text: response.text,
        },
      ],
    };
  }
}
