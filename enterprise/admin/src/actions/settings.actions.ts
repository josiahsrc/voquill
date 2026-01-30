import type { EnterpriseConfig } from "@repo/types";
import { produceAppState } from "../store";
import { invoke } from "../utils/api.utils";

export async function loadSettings() {
  produceAppState((draft) => {
    draft.settings.status = "loading";
  });

  try {
    const [versionData, configData] = await Promise.all([
      invoke("system/getVersion", {}),
      invoke("enterprise/getConfig", {}),
    ]);

    produceAppState((draft) => {
      draft.settings.serverVersion = versionData.version;
      draft.enterpriseConfig = configData.config;
      draft.enterpriseLicense = configData.license;
      draft.settings.status = "success";
    });
  } catch {
    produceAppState((draft) => {
      draft.settings.status = "error";
    });
  }
}

export async function updateEnterpriseConfig(config: EnterpriseConfig) {
  produceAppState((draft) => {
    draft.enterpriseConfig = config;
  });
  await invoke("enterprise/upsertConfig", { config });
}
