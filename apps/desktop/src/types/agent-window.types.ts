export type AgentWindowMessageSender = "me" | "agent";

export type AgentWindowMessage = {
  text: string;
  sender: AgentWindowMessageSender;
};

export type AgentWindowState = {
  messages: AgentWindowMessage[];
};
