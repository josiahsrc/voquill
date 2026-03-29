import { ChatMessage, ChatMessageRole, Nullable } from "@voquill/types";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { BaseRepo } from "./base.repo";

type LocalChatMessage = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: number;
  metadata: Nullable<string>;
};

const fromLocalChatMessage = (local: LocalChatMessage): ChatMessage => ({
  id: local.id,
  conversationId: local.conversationId,
  role: local.role as ChatMessageRole,
  content: local.content,
  createdAt: dayjs(local.createdAt).toISOString(),
  metadata: local.metadata ? JSON.parse(local.metadata) : null,
});

const toLocalChatMessage = (message: ChatMessage): LocalChatMessage => ({
  id: message.id,
  conversationId: message.conversationId,
  role: message.role,
  content: message.content,
  createdAt: dayjs(message.createdAt).valueOf(),
  metadata: message.metadata ? JSON.stringify(message.metadata) : null,
});

export abstract class BaseChatMessageRepo extends BaseRepo {
  abstract listChatMessages(conversationId: string): Promise<ChatMessage[]>;
  abstract createChatMessage(message: ChatMessage): Promise<ChatMessage>;
  abstract updateChatMessage(message: ChatMessage): Promise<ChatMessage>;
  abstract deleteChatMessages(ids: string[]): Promise<void>;
}

export class LocalChatMessageRepo extends BaseChatMessageRepo {
  async listChatMessages(conversationId: string): Promise<ChatMessage[]> {
    const locals = await invoke<LocalChatMessage[]>("chat_message_list", {
      conversationId,
    });
    return locals.map(fromLocalChatMessage);
  }

  async createChatMessage(message: ChatMessage): Promise<ChatMessage> {
    const created = await invoke<LocalChatMessage>("chat_message_create", {
      message: toLocalChatMessage(message),
    });
    return fromLocalChatMessage(created);
  }

  async updateChatMessage(message: ChatMessage): Promise<ChatMessage> {
    const updated = await invoke<LocalChatMessage>("chat_message_update", {
      message: toLocalChatMessage(message),
    });
    return fromLocalChatMessage(updated);
  }

  async deleteChatMessages(ids: string[]): Promise<void> {
    await invoke("chat_message_delete_many", { ids });
  }
}
