import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import type { ChatMessage, ToolPermission } from "@repo/types";
import { isEqual } from "lodash-es";
import { useEffect, useRef } from "react";
import { useTauriListen } from "../../hooks/tauri.hooks";
import type { AppState, StreamingMessageState } from "../../state/app.state";
import { getAppState, useAppStore } from "../../store";
import type { OverlaySyncPayload } from "../../types/overlay.types";

type OverlayReadyPayload = {
  windowLabel: string;
};

const OVERLAY_TARGETS = ["pill-overlay", "toast-overlay"];

const buildFullSyncPayload = (state: AppState): OverlaySyncPayload => ({
  activeRecordingMode: state.activeRecordingMode,
  hotkeyById: state.hotkeyById,
  pillConversationId: state.pillConversationId,
  assistantInputMode: state.assistantInputMode,
  chatMessageById: state.chatMessageById,
  chatMessageIdsByConversationId: state.chatMessageIdsByConversationId,
  userPrefs: state.userPrefs,
  userById: state.userById,
  auth: state.auth,
  memberById: state.memberById,
  onboarding: state.onboarding,
  toneById: state.toneById,
  enterpriseConfig: state.enterpriseConfig,
  toolPermissionById: state.toolPermissionById,
  toolInfoById: state.toolInfoById,
  streamingMessageById: state.streamingMessageById,
});

const useOverlaySync = <T>(
  targets: string[],
  selector: (state: AppState) => T,
  toPayload: (value: T) => OverlaySyncPayload,
) => {
  const value = useAppStore(selector);
  const prevRef = useRef<T | null>(null);
  const toPayloadRef = useRef(toPayload);
  toPayloadRef.current = toPayload;

  useEffect(() => {
    if (prevRef.current !== null && isEqual(prevRef.current, value)) {
      return;
    }

    prevRef.current = value;
    for (const target of targets) {
      emitTo(target, "overlay_sync", toPayloadRef.current(value)).catch(
        console.error,
      );
    }
  }, [value]);
};

export const OverlaySyncSideEffects = () => {
  useTauriListen<OverlayReadyPayload>("overlay_ready", (payload) => {
    const { windowLabel } = payload;
    if (!OVERLAY_TARGETS.includes(windowLabel)) {
      return;
    }

    const state = getAppState();
    const fullPayload = buildFullSyncPayload(state);
    emitTo(windowLabel, "overlay_sync", fullPayload).catch(console.error);
  });

  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.activeRecordingMode,
    (activeRecordingMode) => ({ activeRecordingMode }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.hotkeyById,
    (hotkeyById) => ({ hotkeyById }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.pillConversationId,
    (pillConversationId) => ({ pillConversationId }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.assistantInputMode,
    (assistantInputMode) => ({ assistantInputMode }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.chatMessageById,
    (chatMessageById) => ({ chatMessageById }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.chatMessageIdsByConversationId,
    (chatMessageIdsByConversationId) => ({ chatMessageIdsByConversationId }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.userPrefs,
    (userPrefs) => ({ userPrefs }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.userById,
    (userById) => ({ userById }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.auth,
    (auth) => ({ auth }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.memberById,
    (memberById) => ({ memberById }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.onboarding,
    (onboarding) => ({ onboarding }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.toneById,
    (toneById) => ({ toneById }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.enterpriseConfig,
    (enterpriseConfig) => ({ enterpriseConfig }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.toolPermissionById,
    (toolPermissionById) => ({ toolPermissionById }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.toolInfoById,
    (toolInfoById) => ({ toolInfoById }),
  );
  useOverlaySync(
    OVERLAY_TARGETS,
    (s) => s.streamingMessageById,
    (streamingMessageById) => ({ streamingMessageById }),
  );

  useNativePillAssistantSync();

  return null;
};

type NativePillPayload = {
  type: "assistant_state";
  active: boolean;
  input_mode: string;
  compact: boolean;
  conversation_id: string | null;
  user_prompt: string | null;
  messages: {
    id: string;
    content: string | null;
    is_error: boolean;
    is_tool_result: boolean;
    tool_name: string | null;
    tool_description: string | null;
    reason: string | null;
  }[];
  streaming: {
    message_id: string;
    tool_calls: { id: string; name: string; done: boolean }[];
    reasoning: string;
    is_streaming: boolean;
  } | null;
  permissions: {
    id: string;
    tool_name: string;
    description: string | null;
    reason: string | null;
  }[];
};

const formatPromptPreview = (text: string): string | null => {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  const words = normalized.split(" ");
  if (words.length <= 9) return normalized;
  return `${words.slice(0, 4).join(" ")} ... ${words.slice(-5).join(" ")}`;
};

const buildNativePillMessages = (
  messages: ChatMessage[],
  streamingById: Record<string, StreamingMessageState>,
  toolInfoById: Record<string, { description: string }>,
): NativePillPayload["messages"] => {
  return messages
    .filter((m) => {
      if (m.role === "user") return false;
      if (m.role === "assistant" && !m.content?.trim()) {
        return !!streamingById[m.id];
      }
      return true;
    })
    .map((m) => {
      const meta = m.metadata as Record<string, unknown> | null;
      const isToolResult = meta?.type === "tool-result";
      const toolName = (meta?.toolName as string) ?? null;
      const reason = (meta?.reason as string) ?? null;
      const toolInfo = toolName ? toolInfoById[toolName] : undefined;
      return {
        id: m.id,
        content: m.content || null,
        is_error: m.role === "system",
        is_tool_result: isToolResult,
        tool_name: toolName,
        tool_description: toolInfo?.description ?? null,
        reason,
      };
    });
};

const buildNativePillStreaming = (
  messages: ChatMessage[],
  streamingById: Record<string, StreamingMessageState>,
): NativePillPayload["streaming"] => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const streaming = streamingById[msg.id];
    if (streaming) {
      return {
        message_id: msg.id,
        tool_calls: streaming.toolCalls.map((tc) => ({
          id: tc.toolCallId,
          name: tc.toolName,
          done: tc.done,
        })),
        reasoning: streaming.reasoning,
        is_streaming: streaming.isStreaming,
      };
    }
  }
  return null;
};

const buildNativePillPermissions = (
  permissions: Record<string, ToolPermission>,
  conversationId: string | null,
  toolInfoById: Record<string, { description: string }>,
): NativePillPayload["permissions"] => {
  if (!conversationId) return [];
  return Object.values(permissions)
    .filter(
      (p) => p.conversationId === conversationId && p.status === "pending",
    )
    .map((p) => ({
      id: p.id,
      tool_name: p.toolId,
      description: toolInfoById[p.toolId]?.description ?? null,
      reason: null,
    }));
};

type NativePillSyncState = {
  activeRecordingMode: AppState["activeRecordingMode"];
  assistantInputMode: AppState["assistantInputMode"];
  pillConversationId: AppState["pillConversationId"];
  chatMessageById: AppState["chatMessageById"];
  chatMessageIdsByConversationId: AppState["chatMessageIdsByConversationId"];
  toolPermissionById: AppState["toolPermissionById"];
  toolInfoById: AppState["toolInfoById"];
  streamingMessageById: AppState["streamingMessageById"];
};

const selectNativePillState = (s: AppState): NativePillSyncState => ({
  activeRecordingMode: s.activeRecordingMode,
  assistantInputMode: s.assistantInputMode,
  pillConversationId: s.pillConversationId,
  chatMessageById: s.chatMessageById,
  chatMessageIdsByConversationId: s.chatMessageIdsByConversationId,
  toolPermissionById: s.toolPermissionById,
  toolInfoById: s.toolInfoById,
  streamingMessageById: s.streamingMessageById,
});

const useNativePillAssistantSync = () => {
  const state = useAppStore(selectNativePillState);
  const prevRef = useRef<NativePillSyncState | null>(null);

  useEffect(() => {
    if (prevRef.current !== null && isEqual(prevRef.current, state)) {
      return;
    }
    prevRef.current = state;

    const active = state.activeRecordingMode === "agent";

    const conversationId = state.pillConversationId ?? null;
    const messageIds = conversationId
      ? (state.chatMessageIdsByConversationId[conversationId] ?? [])
      : [];
    const messages: ChatMessage[] = messageIds
      .map((id) => state.chatMessageById[id])
      .filter((m): m is ChatMessage => !!m);

    const pillMessages = buildNativePillMessages(
      messages,
      state.streamingMessageById,
      state.toolInfoById,
    );
    const streaming = buildNativePillStreaming(
      messages,
      state.streamingMessageById,
    );
    const permissions = buildNativePillPermissions(
      state.toolPermissionById,
      conversationId,
      state.toolInfoById,
    );

    const latestUserMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === "user");
    const userPrompt = latestUserMessage?.content
      ? formatPromptPreview(latestUserMessage.content)
      : null;

    const compact =
      state.assistantInputMode !== "type" &&
      messages.length === 0 &&
      permissions.length === 0;

    const payload: NativePillPayload = {
      type: "assistant_state",
      active,
      input_mode: state.assistantInputMode ?? "voice",
      compact,
      conversation_id: conversationId,
      user_prompt: userPrompt,
      messages: pillMessages,
      streaming,
      permissions,
    };

    invoke("sync_native_pill_assistant", {
      payload: JSON.stringify(payload),
    }).catch(() => {});
  }, [state]);
};
