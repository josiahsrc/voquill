import type { ToolInfo, ToolPermissionStatus } from "./ai-tool.types";
import type { LlmChatInput } from "./ai-llm.types";

export interface SidecarReadyEvent {
  type: "ready";
  port: number;
}

export interface ToolsListRequest {
  id: string;
  type: "tools/list";
  conversationId: string;
}

export interface ToolsPermissionRequest {
  id: string;
  type: "tools/permission";
  tool: string;
  params: Record<string, unknown>;
  conversationId: string;
}

export interface ToolsPermissionStatusRequest {
  id: string;
  type: "tools/permission-status";
  permissionId: string;
}

export interface ToolsExecuteRequest {
  id: string;
  type: "tools/execute";
  tool: string;
  token: string;
}

export interface LlmChatRequest {
  id: string;
  type: "llm/chat";
  input: LlmChatInput;
}

export type SidecarRequest =
  | ToolsListRequest
  | ToolsPermissionRequest
  | ToolsPermissionStatusRequest
  | ToolsExecuteRequest
  | LlmChatRequest;

export interface SidecarResponseOk<TResult = unknown> {
  id: string;
  status: "ok";
  result: TResult;
}

export interface SidecarResponseError {
  id: string;
  status: "error";
  error: string;
}

export interface SidecarResponseChunk<TChunk = unknown> {
  id: string;
  status: "chunk";
  data: TChunk;
}

export interface SidecarResponseDone {
  id: string;
  status: "done";
}

export type SidecarResponse =
  | SidecarResponseOk
  | SidecarResponseError
  | SidecarResponseChunk
  | SidecarResponseDone;

export interface ToolsListResult {
  tools: ToolInfo[];
}

export interface ToolsPermissionResult {
  permissionId: string;
}

export interface ToolsPermissionStatusResult {
  status: ToolPermissionStatus;
  token?: string;
}

export type SidecarMessage = SidecarReadyEvent | SidecarRequest | SidecarResponse;

export type AgentStreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; toolCallId: string; toolName: string }
  | { type: "tool-result"; toolCallId: string }
  | { type: "reasoning"; text: string }
  | { type: "finish" }
  | { type: "error"; error: string };
