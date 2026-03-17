import type {
  LlmChatInput,
  LlmMessage,
  LlmStreamEvent,
  LlmTool,
  LlmToolCall,
  ToolInfo,
} from "@repo/types";
import { delayed } from "@repo/utilities";
import { createChatMessage } from "../actions/chat.actions";
import {
  executeTool,
  getToolPermissionStatus,
  requestToolPermission,
} from "../actions/tool.actions";
import { getAgentRepo } from "../repos";
import type { AgentRunState, AgentToolCallState } from "../state/agent.state";
import { createAgentRunState } from "../state/agent.state";
import { getAppState, produceAppState } from "../store";
import { createTool } from "../tools";
import { modifyAgentState } from "../utils/agent.utils";
import { getLogger } from "../utils/log.utils";

const POLL_INTERVAL_MS = 500;

export abstract class BaseAgent {
  abstract readonly agentType: string;

  abstract getTools(): ToolInfo[];

  abstract getSystemPrompt(): string;

  getMaxIterations(): number {
    return 10;
  }

  getRepo() {
    const { repo } = getAgentRepo();
    if (!repo) throw new Error("No LLM provider configured");
    return repo;
  }

  abstract shouldStop(
    agentState: AgentRunState,
    lastToolCalls: LlmToolCall[],
  ): boolean;

  private isAborted(conversationId: string): boolean {
    const state = getAppState().agentStateByConversationId[conversationId];
    return state?.aborted ?? false;
  }

  private consumeAbort(conversationId: string): void {
    produceAppState((draft) => {
      modifyAgentState({ draft, conversationId, modify: (s) => { s.aborted = false; } });
    });
  }

  async run(conversationId: string): Promise<void> {
    const agentState = createAgentRunState(this.agentType, this.getMaxIterations());
    produceAppState((draft) => {
      draft.agentStateByConversationId[conversationId] = agentState;
    });

    try {
      await this.loop(conversationId);
    } catch (error) {
      getLogger().error(`Agent ${this.agentType} error`, error);
      produceAppState((draft) => {
        modifyAgentState({
          draft,
          conversationId,
          modify: (s) => {
            s.status = "error";
            s.error = String(error);
          },
        });
      });
    }
  }

  private async loop(conversationId: string): Promise<void> {
    const maxIterations = this.getMaxIterations();
    for (let i = 0; i < maxIterations; i++) {
      if (this.isAborted(conversationId)) {
        this.consumeAbort(conversationId);
        break;
      }

      produceAppState((draft) => {
        modifyAgentState({
          draft,
          conversationId,
          modify: (s) => {
            s.iteration = i;
            s.status = "calling-llm";
            s.toolCalls = [];
            s.currentToolIndex = 0;
          },
        });
      });

      const { content, toolCalls } = await this.callLlm(conversationId);
      if (this.isAborted(conversationId)) {
        this.consumeAbort(conversationId);
        break;
      }

      if (content || toolCalls.length > 0) {
        await createChatMessage({
          id: crypto.randomUUID(),
          conversationId,
          role: "assistant",
          content: content || "",
          createdAt: new Date().toISOString(),
          metadata: toolCalls.length > 0
            ? { type: "reasoning", toolCalls }
            : null,
        });
      }

      if (
        toolCalls.length === 0 ||
        this.shouldStop(this.getState(conversationId), toolCalls)
      ) {
        produceAppState((draft) => {
          modifyAgentState({
            draft,
            conversationId,
            modify: (s) => { s.status = "done"; },
          });
        });
        break;
      }

      await this.processToolCalls(conversationId, toolCalls);
      if (this.isAborted(conversationId)) {
        this.consumeAbort(conversationId);
        break;
      }
    }

    this.cleanupStreaming(conversationId);
  }

  private async callLlm(
    conversationId: string,
  ): Promise<{ content: string; toolCalls: LlmToolCall[] }> {
    const messages = this.buildMessages(conversationId);
    const tools = this.buildLlmTools();

    const input: LlmChatInput = {
      messages,
      ...(tools.length > 0 && { tools, toolChoice: "auto" }),
    };

    produceAppState((draft) => {
      draft.streamingMessageById[conversationId] = {
        toolCalls: [],
        reasoning: "",
        isStreaming: true,
      };
    });

    let content = "";
    const toolCalls: LlmToolCall[] = [];
    const repo = this.getRepo();

    for await (const event of repo.streamChat(input)) {
      if (this.isAborted(conversationId)) break;
      this.handleStreamEvent(conversationId, event, toolCalls);

      if (event.type === "text-delta") {
        content += event.text;
      }

      if (event.type === "error") {
        throw new Error(event.error);
      }
    }

    produceAppState((draft) => {
      const streaming = draft.streamingMessageById[conversationId];
      if (streaming) streaming.isStreaming = false;
    });

    return { content, toolCalls };
  }

  private handleStreamEvent(
    conversationId: string,
    event: LlmStreamEvent,
    toolCalls: LlmToolCall[],
  ): void {
    if (event.type === "text-delta") {
      produceAppState((draft) => {
        const streaming = draft.streamingMessageById[conversationId];
        if (streaming) streaming.reasoning += event.text;
      });
    }

    if (event.type === "tool-call") {
      toolCalls.push({
        id: event.id,
        name: event.name,
        arguments: event.arguments,
      });
      produceAppState((draft) => {
        const streaming = draft.streamingMessageById[conversationId];
        if (streaming) {
          streaming.toolCalls.push({
            toolCallId: event.id,
            toolName: event.name,
            done: false,
          });
        }
      });
    }
  }

  private async processToolCalls(
    conversationId: string,
    toolCalls: LlmToolCall[],
  ): Promise<void> {
    const toolCallStates: AgentToolCallState[] = toolCalls.map((tc) => ({
      toolCallId: tc.id,
      toolName: tc.name,
      params: JSON.parse(tc.arguments),
      status: "pending" as const,
    }));

    produceAppState((draft) => {
      modifyAgentState({
        draft,
        conversationId,
        modify: (s) => {
          s.status = "processing-tools";
          s.toolCalls = toolCallStates;
          s.currentToolIndex = 0;
        },
      });
    });

    for (let i = 0; i < toolCalls.length; i++) {
      if (this.isAborted(conversationId)) break;

      const toolCall = toolCalls[i];
      const params = toolCallStates[i].params;

      produceAppState((draft) => {
        modifyAgentState({
          draft,
          conversationId,
          modify: (s) => { s.currentToolIndex = i; },
        });
      });

      const result = await this.executeToolCall(
        conversationId,
        toolCall,
        params,
      );

      produceAppState((draft) => {
        modifyAgentState({
          draft,
          conversationId,
          modify: (s) => {
            s.toolCalls[i].result = result ?? {};
            s.toolCalls[i].status = result ? "done" : "denied";
          },
        });
        const streaming = draft.streamingMessageById[conversationId];
        if (streaming) {
          const streamingTc = streaming.toolCalls.find(
            (tc) => tc.toolCallId === toolCall.id,
          );
          if (streamingTc) streamingTc.done = true;
        }
      });

      await createChatMessage({
        id: crypto.randomUUID(),
        conversationId,
        role: "system",
        content: JSON.stringify(result ?? { error: "Tool call was denied" }),
        createdAt: new Date().toISOString(),
        metadata: {
          type: "tool-result",
          toolCallId: toolCall.id,
          toolName: toolCall.name,
        },
      });
    }
  }

  private async executeToolCall(
    conversationId: string,
    toolCall: LlmToolCall,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const state = getAppState();
    const toolInfo = state.toolInfoById[toolCall.name];
    if (!toolInfo) {
      getLogger().error(`Unknown tool: ${toolCall.name}`);
      return { error: `Unknown tool: ${toolCall.name}` };
    }

    const tool = createTool(toolInfo);
    if (tool.getAlwaysAllow(params)) {
      return await executeTool(toolCall.name, params);
    }

    const permissionId = requestToolPermission(
      toolCall.name,
      params,
      conversationId,
    );

    produceAppState((draft) => {
      modifyAgentState({
        draft,
        conversationId,
        modify: (s) => {
          const tc = s.toolCalls.find(
            (t) => t.toolCallId === toolCall.id,
          );
          if (tc) {
            tc.permissionId = permissionId;
            tc.status = "awaiting-permission";
          }
        },
      });
    });

    const resolution = await this.pollForPermission(
      conversationId,
      permissionId,
    );

    if (resolution === "allowed") {
      return await executeTool(toolCall.name, params);
    }

    return null;
  }

  private async pollForPermission(
    conversationId: string,
    permissionId: string,
  ): Promise<"allowed" | "denied"> {
    while (!this.isAborted(conversationId)) {
      const result = getToolPermissionStatus(permissionId);
      if (result?.status === "allowed") return "allowed";
      if (result?.status === "denied") return "denied";
      await delayed(POLL_INTERVAL_MS);
    }
    return "denied";
  }

  private buildMessages(conversationId: string): LlmMessage[] {
    const state = getAppState();
    const messageIds =
      state.chatMessageIdsByConversationId[conversationId] ?? [];

    const messages: LlmMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
    ];

    for (const id of messageIds) {
      const msg = state.chatMessageById[id];
      if (!msg) continue;

      const metadata = msg.metadata as Record<string, unknown> | null;

      if (metadata?.type === "tool-result") {
        messages.push({
          role: "tool",
          toolCallId: metadata.toolCallId as string,
          content: msg.content,
        });
      } else if (msg.role === "assistant") {
        const toolCalls = metadata?.toolCalls as LlmToolCall[] | undefined;
        messages.push({
          role: "assistant",
          content: msg.content || undefined,
          ...(toolCalls && { toolCalls }),
        });
      } else if (msg.role === "user") {
        messages.push({ role: "user", content: msg.content });
      }
    }

    return messages;
  }

  private buildLlmTools(): LlmTool[] {
    return this.getTools().map((tool) => ({
      name: tool.id,
      description: `${tool.description}. ${tool.instructions}`,
      parameters: tool.schema,
    }));
  }

  private getState(conversationId: string): AgentRunState {
    return getAppState().agentStateByConversationId[conversationId]!;
  }

  private cleanupStreaming(conversationId: string): void {
    produceAppState((draft) => {
      delete draft.streamingMessageById[conversationId];
    });
  }
}
