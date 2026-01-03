export type AgentWindowMessageSender = "me" | "agent";

export type AgentWindowMessage = {
  text: string;
  sender: AgentWindowMessageSender;
  isError?: boolean;
};

export type AgentWindowState = {
  messages: AgentWindowMessage[];
};
