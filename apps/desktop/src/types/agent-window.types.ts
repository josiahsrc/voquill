export type AgentWindowMessageSender = "me" | "agent";

export type AgentWindowMessage = {
  text: string;
  sender: AgentWindowMessageSender;
  isError?: boolean;
  tools?: string[];
  draft?: string;
};

export type AgentWindowState = {
  messages: AgentWindowMessage[];
};
