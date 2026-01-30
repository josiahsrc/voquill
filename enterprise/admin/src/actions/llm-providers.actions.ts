import type { LlmProviderInput } from "@repo/types";
import { produceAppState } from "../store";
import { invoke } from "../utils/api.utils";
import { registerLlmProviders } from "../utils/app.utils";

export async function loadLlmProviders() {
  produceAppState((draft) => {
    draft.llmProviders.status = "loading";
  });

  try {
    const data = await invoke("llmProvider/list", {});
    produceAppState((draft) => {
      registerLlmProviders(draft, data.providers);
      draft.llmProviders.providerIds = data.providers.map((p) => p.id);
      draft.llmProviders.status = "success";
    });
  } catch {
    produceAppState((draft) => {
      draft.llmProviders.status = "error";
    });
  }
}

export async function upsertLlmProvider(provider: LlmProviderInput) {
  await invoke("llmProvider/upsert", { provider });
  await loadLlmProviders();
}

export async function pullLlmProvider(providerId: string) {
  const data = await invoke("llmProvider/pull", { providerId });
  if (data.provider) {
    produceAppState((draft) => {
      registerLlmProviders(draft, [data.provider!]);
    });
  }
}

export async function deleteLlmProvider(providerId: string) {
  await invoke("llmProvider/delete", { providerId });
  produceAppState((draft) => {
    draft.llmProviders.providerIds = draft.llmProviders.providerIds.filter(
      (id) => id !== providerId,
    );
    delete draft.llmProviderById[providerId];
  });
}
