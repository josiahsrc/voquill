import { ApiKey } from "@repo/types";
import { getApiKeyRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import { registerApiKeys } from "../utils/app.utils";
import { showErrorSnackbar } from "./app.actions";
import {
  DEFAULT_POST_PROCESSING_MODE,
  DEFAULT_PROCESSING_MODE,
} from "../types/ai.types";
import { syncAiPreferences } from "./user.actions";
import type { CreateApiKeyPayload } from "../repos/api-key.repo";

let loadApiKeysPromise: Promise<void> | null = null;

const sortApiKeys = (apiKeys: ApiKey[]): ApiKey[] =>
  [...apiKeys].sort(
    (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis(),
  );

export const loadApiKeys = async (): Promise<void> => {
  const status = getAppState().settings.apiKeysStatus;

  if (status === "loading" || status === "success") {
    return;
  }

  if (loadApiKeysPromise) {
    return loadApiKeysPromise;
  }

  produceAppState((draft) => {
    draft.settings.apiKeysStatus = "loading";
  });

  loadApiKeysPromise = getApiKeyRepo()
    .listApiKeys()
    .then((apiKeys) => {
      produceAppState((draft) => {
        registerApiKeys(draft, apiKeys);
        draft.settings.apiKeys = sortApiKeys(apiKeys);
        draft.settings.apiKeysStatus = "success";
      });
    })
    .catch((error) => {
      console.error("Failed to load API keys", error);
      produceAppState((draft) => {
        draft.settings.apiKeysStatus = "error";
      });
      showErrorSnackbar("Failed to load API keys. Please try again.");
    })
    .finally(() => {
      loadApiKeysPromise = null;
    });

  return loadApiKeysPromise;
};

export const createApiKey = async (
  payload: CreateApiKeyPayload,
): Promise<ApiKey> => {
  try {
    const created = await getApiKeyRepo().createApiKey(payload);

    produceAppState((draft) => {
      registerApiKeys(draft, [created]);
      const merged = draft.settings.apiKeys.filter(
        (apiKey) => apiKey.id !== created.id,
      );
      merged.unshift(created);
      draft.settings.apiKeys = sortApiKeys(merged);
      draft.settings.apiKeysStatus = "success";
    });

    return created;
  } catch (error) {
    console.error("Failed to create API key", error);
    showErrorSnackbar(
      error instanceof Error ? error.message : "Failed to save API key.",
    );
    throw error;
  }
};

export const deleteApiKey = async (id: string): Promise<void> => {
  try {
    await getApiKeyRepo().deleteApiKey(id);

    produceAppState((draft) => {
      delete draft.apiKeyById[id];
      draft.settings.apiKeys = draft.settings.apiKeys.filter(
        (apiKey) => apiKey.id !== id,
      );
      if (draft.settings.aiTranscription.selectedApiKeyId === id) {
        draft.settings.aiTranscription.selectedApiKeyId = null;
        draft.settings.aiTranscription.mode = DEFAULT_PROCESSING_MODE;
      }
      if (draft.settings.aiPostProcessing.selectedApiKeyId === id) {
        draft.settings.aiPostProcessing.selectedApiKeyId = null;
        draft.settings.aiPostProcessing.mode = DEFAULT_POST_PROCESSING_MODE;
      }
    });

    await syncAiPreferences();
  } catch (error) {
    console.error("Failed to delete API key", error);
    showErrorSnackbar(
      error instanceof Error ? error.message : "Failed to delete API key.",
    );
    throw error;
  }
};
