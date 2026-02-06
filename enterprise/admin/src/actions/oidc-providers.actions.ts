import type { OidcProviderInput } from "@repo/types";
import { produceAppState } from "../store";
import { invoke } from "../utils/api.utils";
import { registerOidcProviders } from "../utils/app.utils";

export async function loadOidcProviders() {
  try {
    const data = await invoke("oidcProvider/list", {});
    produceAppState((draft) => {
      registerOidcProviders(draft, data.providers);
      draft.oidcProviders.providerIds = data.providers.map((p) => p.id);
      draft.oidcProviders.status = "success";
    });
  } catch {
    produceAppState((draft) => {
      draft.oidcProviders.status = "error";
    });
  }
}

export async function upsertOidcProvider(provider: OidcProviderInput) {
  await invoke("oidcProvider/upsert", { provider });
  await loadOidcProviders();
}

export async function deleteOidcProvider(providerId: string) {
  await invoke("oidcProvider/delete", { providerId });
  produceAppState((draft) => {
    draft.oidcProviders.providerIds = draft.oidcProviders.providerIds.filter(
      (id) => id !== providerId,
    );
    delete draft.oidcProviderById[providerId];
  });
}
