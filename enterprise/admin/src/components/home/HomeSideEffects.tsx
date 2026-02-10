import {
  loadLlmProviders,
  pullLlmProvider,
} from "../../actions/llm-providers.actions";
import { loadOidcProviders } from "../../actions/oidc-providers.actions";
import { loadSettings } from "../../actions/settings.actions";
import {
  loadSttProviders,
  pullSttProvider,
} from "../../actions/stt-providers.actions";
import { loadMyUser, loadUsers } from "../../actions/users.actions";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { getAppState } from "../../store";

const TEN_SECONDS = 1000 * 10;
const FIVE_MINUTES = 1000 * 60 * 5;

export default function HomeSideEffects() {
  useIntervalAsync(FIVE_MINUTES, async () => {
    await Promise.allSettled([
      loadSttProviders(),
      loadLlmProviders(),
      loadOidcProviders(),
    ]);
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

  useIntervalAsync(TEN_SECONDS, async () => {
    await Promise.allSettled([loadSettings(), loadUsers(), loadMyUser()]);
  }, []);

  return null;
}
