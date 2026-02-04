import type { SttProviderInput } from "@repo/types";
import { produceAppState } from "../store";
import { invoke } from "../utils/api.utils";
import { registerSttProviders } from "../utils/app.utils";

export async function loadSttProviders() {
  try {
    const data = await invoke("sttProvider/list", {});
    produceAppState((draft) => {
      registerSttProviders(draft, data.providers);
      draft.sttProviders.providerIds = data.providers.map((p) => p.id);
      draft.sttProviders.status = "success";
    });
  } catch {
    produceAppState((draft) => {
      draft.sttProviders.status = "error";
    });
  }
}

export async function upsertSttProvider(provider: SttProviderInput) {
  await invoke("sttProvider/upsert", { provider });
  await loadSttProviders();
}

export async function pullSttProvider(providerId: string) {
  produceAppState((draft) => {
    const provider = draft.sttProviderById[providerId];
    if (provider) {
      provider.pullStatus = "in_progress";
      provider.pullError = null;
    }
  });
  const data = await invoke("sttProvider/pull", { providerId });
  if (data.provider) {
    produceAppState((draft) => {
      registerSttProviders(draft, [data.provider!]);
    });
  }
}

export async function deleteSttProvider(providerId: string) {
  await invoke("sttProvider/delete", { providerId });
  produceAppState((draft) => {
    draft.sttProviders.providerIds = draft.sttProviders.providerIds.filter(
      (id) => id !== providerId,
    );
    delete draft.sttProviderById[providerId];
  });
}
