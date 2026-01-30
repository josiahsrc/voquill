import {
  loadLlmProviders,
  pullLlmProvider,
} from "../../actions/llm-providers.actions";
import {
  loadSttProviders,
  pullSttProvider,
} from "../../actions/stt-providers.actions";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { getAppState } from "../../store";

const TEN_SECONDS = 1000 * 10;
const FIVE_MINUTES = 1000 * 60 * 5;

export default function HomeSideEffects() {
  useIntervalAsync(FIVE_MINUTES, async () => {
    await Promise.allSettled([loadSttProviders(), loadLlmProviders()]);
  }, []);

  useIntervalAsync(TEN_SECONDS, async () => {
    const state = getAppState();

    for (const id of state.sttProviders.providerIds) {
      const provider = state.sttProviderById[id];
      if (provider && provider.pullStatus !== "complete") {
        await pullSttProvider(id);
      }
    }

    for (const id of state.llmProviders.providerIds) {
      const provider = state.llmProviderById[id];
      if (provider && provider.pullStatus !== "complete") {
        await pullLlmProvider(id);
      }
    }
  }, []);

  return null;
}
