import {
  ApiKey,
  AppTarget,
  ChatMessage,
  Conversation,
  Hotkey,
  Member,
  Term,
  Tone,
  ToolInfo,
  ToolPermission,
  Transcription,
  User,
} from "@repo/types";
import type { AppState, SnackbarMode } from "../state/app.state";

export type ShowSnackbarOpts = {
  duration?: number;
  transitionDuration?: number;
  mode?: SnackbarMode;
};

export const setSnackbar = (
  draft: AppState,
  message: string,
  opts?: ShowSnackbarOpts,
): void => {
  draft.snackbarMessage = message;
  draft.snackbarCounter++;
  draft.snackbarMode = opts?.mode ?? "info";
  draft.snackbarDuration = opts?.duration ?? 3000;
  draft.snackbarTransitionDuration = opts?.transitionDuration;
};

export const registerUsers = (draft: AppState, users: User[]): void => {
  for (const user of users) {
    draft.userById[user.id] = user;
  }
};

export const registerTranscriptions = (
  draft: AppState,
  transcriptions: Transcription[],
): void => {
  for (const transcription of transcriptions) {
    draft.transcriptionById[transcription.id] = transcription;
  }
};

export const registerTerms = (draft: AppState, terms: Term[]): void => {
  for (const term of terms) {
    draft.termById[term.id] = term;
  }
};

export const registerHotkeys = (draft: AppState, hotkeys: Hotkey[]): void => {
  for (const hotkey of hotkeys) {
    draft.hotkeyById[hotkey.id] = hotkey;
  }
};

export const registerApiKeys = (draft: AppState, apiKeys: ApiKey[]): void => {
  for (const apiKey of apiKeys) {
    draft.apiKeyById[apiKey.id] = apiKey;
  }
};

export const registerTones = (draft: AppState, tones: Tone[]): void => {
  for (const tone of tones) {
    draft.toneById[tone.id] = tone;
  }
};

export const registerMembers = (draft: AppState, members: Member[]): void => {
  for (const member of members) {
    draft.memberById[member.id] = member;
  }
};

export const registerAppTargets = (
  draft: AppState,
  appTargets: AppTarget[],
): void => {
  for (const appTarget of appTargets) {
    draft.appTargetById[appTarget.id] = appTarget;
  }
};

export const registerConversations = (
  draft: AppState,
  conversations: Conversation[],
): void => {
  for (const conversation of conversations) {
    draft.conversationById[conversation.id] = conversation;
  }
};

export const registerToolInfos = (
  draft: AppState,
  toolInfos: ToolInfo[],
): void => {
  for (const toolInfo of toolInfos) {
    draft.toolInfoById[toolInfo.id] = toolInfo;
  }
};

export const registerToolPermission = (
  draft: AppState,
  permission: ToolPermission,
): void => {
  draft.toolPermissionById[permission.id] = permission;
};

export const registerChatMessages = (
  draft: AppState,
  conversationId: string,
  messages: ChatMessage[],
): void => {
  for (const message of messages) {
    draft.chatMessageById[message.id] = message;
  }
  draft.chatMessageIdsByConversationId[conversationId] = messages
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((m) => m.id);
};
