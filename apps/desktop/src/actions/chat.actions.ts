import type { ChatMessage, ChatMessageRole, Conversation } from "@repo/types";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { getChatMessageRepo, getConversationRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import {
  registerChatMessages,
  registerConversations,
} from "../utils/app.utils";
import { createId } from "../utils/id.utils";

export const loadConversations = async (): Promise<void> => {
  produceAppState((draft) => {
    draft.chat.status = "loading";
  });

  try {
    const conversations = await getConversationRepo().listConversations();
    produceAppState((draft) => {
      registerConversations(draft, conversations);
      draft.chat.conversationIds = conversations.map((c) => c.id);
      draft.chat.status = "success";
    });
  } catch (error) {
    console.error("Failed to load conversations", error);
    produceAppState((draft) => {
      draft.chat.status = "error";
    });
    throw error;
  }
};

export const createConversation = async (
  conversation: Conversation,
): Promise<Conversation> => {
  const saved = await getConversationRepo().createConversation(conversation);

  produceAppState((draft) => {
    registerConversations(draft, [saved]);
    draft.chat.conversationIds.unshift(saved.id);
  });

  return saved;
};

export const updateConversation = async (
  conversation: Conversation,
): Promise<Conversation> => {
  const saved = await getConversationRepo().updateConversation(conversation);

  produceAppState((draft) => {
    registerConversations(draft, [saved]);
  });

  return saved;
};

export const deleteConversation = async (id: string): Promise<void> => {
  await getConversationRepo().deleteConversation(id);

  produceAppState((draft) => {
    delete draft.conversationById[id];
    draft.chat.conversationIds = draft.chat.conversationIds.filter(
      (cid) => cid !== id,
    );

    const messageIds = draft.chatMessageIdsByConversationId[id] ?? [];
    for (const messageId of messageIds) {
      delete draft.chatMessageById[messageId];
    }
    delete draft.chatMessageIdsByConversationId[id];
  });
};

export const loadChatMessages = async (
  conversationId: string,
): Promise<void> => {
  const messages = await getChatMessageRepo().listChatMessages(conversationId);

  produceAppState((draft) => {
    registerChatMessages(draft, conversationId, messages);
  });
};

export const createChatMessage = async (
  message: ChatMessage,
): Promise<ChatMessage> => {
  const saved = await getChatMessageRepo().createChatMessage(message);

  produceAppState((draft) => {
    draft.chatMessageById[saved.id] = saved;
    const ids =
      draft.chatMessageIdsByConversationId[saved.conversationId] ?? [];
    ids.push(saved.id);
    draft.chatMessageIdsByConversationId[saved.conversationId] = ids;
  });

  return saved;
};

export const updateChatMessage = async (
  message: ChatMessage,
): Promise<ChatMessage> => {
  const saved = await getChatMessageRepo().updateChatMessage(message);

  produceAppState((draft) => {
    draft.chatMessageById[saved.id] = saved;
  });

  return saved;
};

export const deleteChatMessages = async (
  conversationId: string,
  ids: string[],
): Promise<void> => {
  await getChatMessageRepo().deleteChatMessages(ids);

  produceAppState((draft) => {
    for (const id of ids) {
      delete draft.chatMessageById[id];
    }
    const existing = draft.chatMessageIdsByConversationId[conversationId] ?? [];
    const idSet = new Set(ids);
    draft.chatMessageIdsByConversationId[conversationId] = existing.filter(
      (mid) => !idSet.has(mid),
    );
  });
};

export const sendChatMessage = async (
  conversationId: string,
  text: string,
): Promise<void> => {
  const { aiSidecar } = getAppState();
  if (aiSidecar.status !== "running" || !aiSidecar.port || !aiSidecar.apiKey) {
    throw new Error("AI sidecar is not running");
  }

  const userMessage: ChatMessage = {
    id: createId(),
    conversationId,
    role: "user",
    content: text,
    createdAt: new Date().toISOString(),
    metadata: null,
  };

  const isFirstMessage =
    (getAppState().chatMessageIdsByConversationId[conversationId] ?? [])
      .length === 0;

  await createChatMessage(userMessage);

  if (isFirstMessage) {
    const conversation = getAppState().conversationById[conversationId];
    if (conversation) {
      const title = text.length > 100 ? `${text.slice(0, 100)}…` : text;
      updateConversation({ ...conversation, title });
    }
  }

  const allMessages = buildMessageHistory(conversationId);

  const assistantId = createId();
  const assistantMessage: ChatMessage = {
    id: assistantId,
    conversationId,
    role: "assistant",
    content: "",
    createdAt: new Date().toISOString(),
    metadata: null,
  };

  produceAppState((draft) => {
    draft.chatMessageById[assistantId] = assistantMessage;
    const ids = draft.chatMessageIdsByConversationId[conversationId] ?? [];
    ids.push(assistantId);
    draft.chatMessageIdsByConversationId[conversationId] = ids;
  });

  try {
    const response = await tauriFetch(
      `http://127.0.0.1:${aiSidecar.port}/api/agents/voquill-agent/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiSidecar.apiKey}`,
        },
        body: JSON.stringify({ messages: allMessages, conversationId }),
      },
    );

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `Sidecar returned HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;

      produceAppState((draft) => {
        const msg = draft.chatMessageById[assistantId];
        if (msg) {
          msg.content = fullResponse;
        }
      });
    }

    const finalMessage: ChatMessage = {
      ...assistantMessage,
      content: fullResponse,
      createdAt: new Date().toISOString(),
    };
    await getChatMessageRepo().createChatMessage(finalMessage);
  } catch (error) {
    produceAppState((draft) => {
      const msg = draft.chatMessageById[assistantId];
      if (msg) {
        msg.content = error instanceof Error ? error.message : String(error);
        msg.role = "system";
      }
    });
    throw error;
  }
};

function buildMessageHistory(
  conversationId: string,
): Array<{ role: ChatMessageRole; content: string }> {
  const state = getAppState();
  const ids = state.chatMessageIdsByConversationId[conversationId] ?? [];
  return ids
    .map((id) => state.chatMessageById[id])
    .filter((m): m is ChatMessage => !!m && m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));
}
