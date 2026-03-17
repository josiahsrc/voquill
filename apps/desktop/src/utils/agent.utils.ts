import { AgentRunState } from "../state/agent.state";
import { AppState } from "../state/app.state";

export const modifyAgentState = (args: {
  draft: AppState;
  conversationId: string;
  modify: (state: AgentRunState) => void;
}): void => {
  const { draft, conversationId, modify } = args;
  const state = draft.agentStateByConversationId[conversationId];
  if (state) {
    modify(state);
  }
};
