import { ActionStatus } from "../types/state.types";

export type ChatState = {
  conversationIds: string[];
  status: ActionStatus;
  pendingConversationId: string | null;
};

export const INITIAL_CHAT_STATE: ChatState = {
  conversationIds: [],
  status: "idle",
  pendingConversationId: null,
};
