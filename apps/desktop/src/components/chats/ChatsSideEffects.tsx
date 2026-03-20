import { loadConversations } from "../../actions/chat.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useOnExit } from "../../hooks/helper.hooks";
import { INITIAL_CHAT_STATE } from "../../state/chat.state";
import { produceAppState } from "../../store";

export const ChatsSideEffects = () => {
  useAsyncEffect(async () => {
    await loadConversations();
  }, []);

  useOnExit(() => {
    produceAppState((draft) => {
      Object.assign(draft.chat, INITIAL_CHAT_STATE);
    });
  });

  return null;
};
